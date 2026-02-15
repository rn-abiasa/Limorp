import Block from "./block.js";
import Transaction from "./transaction.js";
import { runContract } from "./vm.js";
import State from "./state.js";
import Mempool from "./mempool.js";
import Consensus from "./consensus.js";
import Economy from "./economy.js";

export default class Blockchain {
  constructor() {
    this.chain = [this.genesis()];
    this.state = new State();
    this.mempoolManager = new Mempool();
    this.consensus = new Consensus();
    this.economy = new Economy();
  }

  async init() {
    const loaded = await this.state.load();
    if (loaded) {
      // Reconstruct chain if needed (hashes are usually okay)
      const saved = await import("../db/db.js").then((m) => m.default.load());
      this.chain = saved.chain.map((b) => new Block(b));
      console.log("Blockchain: State and Chain loaded.");
    }
  }

  async save() {
    await this.state.save(this.chain);
  }

  genesis() {
    return new Block({
      index: 0,
      lastHash: "0",
      timestamp: 1739530000000,
      transactions: [],
      validator: "GENESIS",
    });
  }

  lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Delegated getters
  getBalance(addr) {
    return this.state.getBalance(addr);
  }
  getNonce(addr) {
    return this.state.getNonce(addr);
  }
  getValidValidators() {
    return this.consensus.getValidValidators();
  }
  registerValidator(addr) {
    return this.consensus.registerValidator(addr);
  }
  selectValidator(seed, current) {
    return this.consensus.selectValidator(seed, current);
  }
  getMinFee() {
    return 1n + BigInt(Math.floor(this.mempoolManager.size / 5));
  }

  getPendingNonce(address) {
    const mempoolTxs = this.mempoolManager.filterBySender(address);
    if (mempoolTxs.length === 0) return this.getNonce(address);
    const maxNonce = Math.max(...mempoolTxs.map((tx) => tx.nonce));
    return maxNonce + 1;
  }

  getPendingBalance(address) {
    const confirmedBalance = this.getBalance(address);
    const pendingSpent = this.mempoolManager
      .filterBySender(address)
      .reduce((sum, tx) => {
        const amount = tx.amount !== undefined ? BigInt(tx.amount) : 0n;
        const fee = tx.fee !== undefined ? BigInt(tx.fee) : 0n;
        return sum + amount + fee;
      }, 0n);
    return confirmedBalance - pendingSpent;
  }

  addTransaction(txData) {
    const tx = txData instanceof Transaction ? txData : new Transaction(txData);

    if (!Transaction.verify(tx)) return "ERROR";

    // Nonce check
    const currentNonce = this.getNonce(tx.from);
    if (tx.nonce < currentNonce) return "SKIPPED";

    const expectedNonce = this.getPendingNonce(tx.from);
    if (tx.nonce !== expectedNonce) return "ERROR";

    // Fee check
    const minFee = this.getMinFee();
    if (BigInt(tx.fee) < minFee) return "ERROR";

    // Balance check
    if (BigInt(tx.amount) + BigInt(tx.fee) > this.getPendingBalance(tx.from))
      return "ERROR";

    return this.mempoolManager.add(tx);
  }

  applyTransaction(tx) {
    if (!Transaction.verify(tx)) return false;

    const currentNonce = this.getNonce(tx.from);
    if (tx.from !== "SYSTEM" && tx.nonce !== currentNonce) return false;

    const amount = tx.amount !== undefined ? BigInt(tx.amount) : 0n;
    const fee = tx.fee !== undefined ? BigInt(tx.fee) : 0n;

    if (tx.type !== "REWARD") {
      if (this.getBalance(tx.from) < amount + fee) return false;
      this.state.updateBalance(tx.from, -(amount + fee));
    }

    if (
      tx.type === "TRANSFER" ||
      tx.type === "CONTRACT_CALL" ||
      tx.type === "REWARD"
    ) {
      this.state.updateBalance(tx.to, amount);
    }

    if (tx.type === "CONTRACT_DEPLOY") {
      const contractAddress = tx.calculateHash();
      try {
        const initialState = runContract(tx.code, {}, tx.input, tx.from, 0n);
        this.state.setContract(contractAddress, {
          code: tx.code,
          state: initialState,
          metadata: { creator: tx.from, timestamp: Date.now() },
        });
      } catch (e) {
        console.error(`Deployment failed:`, e.message);
        return true;
      }
    } else if (tx.type === "CONTRACT_CALL") {
      const contract = this.state.getContract(tx.to);
      if (!contract) return false;
      try {
        const newState = runContract(
          contract.code,
          contract.state,
          tx.input,
          tx.from,
          amount,
        );
        this.state.contractState[tx.to].state = newState;
      } catch (e) {
        console.error(`Execution failed:`, e.message);
        return true;
      }
    }

    if (tx.from !== "SYSTEM") {
      this.state.setNonce(tx.from, currentNonce + 1);
    }
    return true;
  }

  async createBlock(validatorWallet) {
    const scheduledWinner = this.consensus.selectValidator(
      this.lastBlock().hash,
      validatorWallet.publicKey,
    );
    if (validatorWallet.publicKey !== scheduledWinner) return null;

    const MAX_BLOCK_TXS = 50;
    const transactions = this.mempoolManager
      .getSorted()
      .slice(0, MAX_BLOCK_TXS)
      .map((tx) => {
        tx.hash = tx.calculateHash();
        return tx;
      });

    const block = new Block({
      index: this.chain.length,
      lastHash: this.lastBlock().hash,
      timestamp: Date.now(),
      transactions,
      validator: validatorWallet.publicKey,
    });

    if (await this.addBlock(block)) return block;
    return null;
  }

  async addBlock(block) {
    if (block.lastHash !== this.lastBlock().hash) return false;

    const scheduledWinner = this.consensus.selectValidator(
      block.lastHash,
      block.validator,
    );
    if (block.validator !== scheduledWinner) return false;

    let totalFees = 0n;
    let existingRewardTx = null;

    for (const txData of block.transactions) {
      const tx =
        txData instanceof Transaction ? txData : new Transaction(txData);
      if (tx.type === "REWARD") {
        existingRewardTx = tx;
        continue;
      }

      tx.hash = tx.hash || tx.calculateHash();
      if (!this.applyTransaction(tx)) return false;
      totalFees += BigInt(tx.fee || 0n);
    }

    const currentReward = this.economy.getReward(block.index);
    const validatorFeeShare = this.economy.calculateFeeSplit(totalFees);
    const expectedRewardAmount = currentReward + validatorFeeShare;

    if (existingRewardTx) {
      if (BigInt(existingRewardTx.amount) !== expectedRewardAmount)
        return false;
      this.applyTransaction(existingRewardTx);
    } else {
      const rewardTx = new Transaction({
        from: "SYSTEM",
        to: block.validator,
        amount: expectedRewardAmount,
        fee: 0n,
        type: "REWARD",
        timestamp: block.timestamp,
      });
      rewardTx.hash = rewardTx.calculateHash();
      this.applyTransaction(rewardTx);
      block.transactions.unshift(rewardTx);
      block.hash = new Block(block).calculateHash();
    }

    this.chain.push(block);

    // Clear mempool
    const blockHashes = block.transactions.map((tx) => tx.hash);
    this.mempoolManager.remove(blockHashes);

    await this.save();
    return true;
  }

  async rebuildFrom(newChainData) {
    this.state.reset();
    this.chain = [this.genesis()];

    for (let i = 1; i < newChainData.length; i++) {
      const block = new Block(newChainData[i]);
      if (block.lastHash !== this.lastBlock().hash) return false;

      for (const txData of block.transactions) {
        const tx = new Transaction(txData);
        tx.hash = tx.calculateHash();
        this.applyTransaction(tx);
      }
      this.chain.push(block);
    }
    await this.save();
    return true;
  }

  isValidChain(chain) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(this.genesis()))
      return false;
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const lastBlock = chain[i - 1];
      if (block.lastHash !== lastBlock.hash) return false;
      const blockInstance = new Block(block);
      if (block.hash !== blockInstance.calculateHash()) return false;
    }
    return true;
  }

  addPeer(peer) {
    if (!this.peers.includes(peer)) {
      this.peers.push(peer);
      this.save();
    }
  }

  get mempool() {
    return this.mempoolManager.transactions;
  }
  get contractState() {
    return this.state.contractState;
  }
  get validators() {
    return this.consensus.validators;
  }
  get balances() {
    return this.state.balances;
  }
  get nonces() {
    return this.state.nonces;
  }
  get peers() {
    return this.state.peers;
  }
  set peers(v) {
    this.state.peers = v;
  }
  get nodeId() {
    return this.state.nodeId;
  }
  set nodeId(v) {
    this.state.nodeId = v;
  }
}
