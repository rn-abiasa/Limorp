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

    // 1. Basic Structure & Cryptographic Verification
    if (!Transaction.verify(tx)) {
      console.warn(
        `Mempool: Invalid signature or structure for tx ${tx.hash?.slice(0, 10)}`,
      );
      return "ERROR";
    }

    // 2. Nonce Check (Against Confirmed State)
    const currentNonce = this.getNonce(tx.from);
    if (tx.nonce < currentNonce) {
      console.warn(
        `Mempool: Nonce too low for ${tx.from?.slice(0, 10)}. Got ${tx.nonce}, expected >= ${currentNonce}`,
      );
      return "SKIPPED";
    }

    // 3. Nonce Check (Against Pending Mempool)
    const expectedNonce = this.getPendingNonce(tx.from);
    if (tx.nonce !== expectedNonce) {
      console.warn(
        `Mempool: Nonce mismatch for ${tx.from?.slice(0, 10)}. Got ${tx.nonce}, expected ${expectedNonce}`,
      );
      return "ERROR";
    }

    // 4. Fee Check
    const minFee = this.getMinFee();
    if (BigInt(tx.fee) < minFee) {
      console.warn(`Mempool: Fee too low. Got ${tx.fee}, min ${minFee}`);
      return "ERROR";
    }

    // 5. Balance Check (Against Pending Balance)
    const amount = BigInt(tx.amount || 0n);
    const fee = BigInt(tx.fee || 0n);
    const pendingBalance = this.getPendingBalance(tx.from);

    if (amount + fee > pendingBalance) {
      console.warn(
        `Mempool: Insufficient pending balance for ${tx.from?.slice(0, 10)}. Need ${amount + fee}, have ${pendingBalance}`,
      );
      return "ERROR";
    }

    // Set hash before adding to mempool
    tx.hash = tx.hash || tx.calculateHash();

    return this.mempoolManager.add(tx);
  }

  applyTransaction(tx) {
    if (!Transaction.verify(tx)) {
      console.log(
        `ApplyTx Fail: Signature/Verification failed for tx ${tx.hash?.slice(0, 10)}`,
      );
      return false;
    }

    const from = tx.from;
    const to = tx.to;
    const amount = BigInt(tx.amount || 0n);
    const fee = BigInt(tx.fee || 0n);
    const currentNonce = this.getNonce(from);

    // Standard Tx Checks
    if (from !== "SYSTEM") {
      if (tx.nonce !== currentNonce || this.getBalance(from) < amount + fee)
        return false;
      this.state.updateBalance(from, -(amount + fee));
      this.state.setNonce(from, currentNonce + 1);
    }

    // Transfers & Smart Contracts
    if (["TRANSFER", "CONTRACT_CALL", "REWARD"].includes(tx.type)) {
      this.state.updateBalance(to, amount);
    }

    if (tx.type === "CONTRACT_DEPLOY") {
      try {
        const initialState = runContract(tx.code, {}, tx.input, from, 0n);
        this.state.setContract(tx.calculateHash(), {
          code: tx.code,
          state: initialState,
          metadata: { creator: from, timestamp: Date.now() },
        });
      } catch (e) {
        console.error(`Contract Deploy Fail:`, e.message);
      }
    } else if (tx.type === "CONTRACT_CALL") {
      const contract = this.state.getContract(to);
      if (!contract) return false;
      try {
        const newState = runContract(
          contract.code,
          contract.state,
          tx.input,
          from,
          amount,
        );
        this.state.contractState[to].state = newState;
      } catch (e) {
        console.error(`Contract Call Fail:`, e.message);
      }
    }

    return true;
  }

  async createBlock(validatorWallet) {
    const last = this.lastBlock();
    if (
      validatorWallet.publicKey !==
      this.selectValidator(last.hash, validatorWallet.publicKey)
    )
      return null;

    const validTxs = [],
      toxic = [];
    const offsets = { nonce: {}, balance: {} };

    for (const tx of this.mempoolManager.getSorted()) {
      if (validTxs.length >= 50) break;
      const from = tx.from;
      const nonce = this.getNonce(from) + (offsets.nonce[from] || 0);
      const balance = this.getBalance(from) - (offsets.balance[from] || 0n);
      const cost = BigInt(tx.amount || 0n) + BigInt(tx.fee || 0n);

      if (tx.nonce === nonce && cost <= balance && Transaction.verify(tx)) {
        validTxs.push(tx);
        offsets.nonce[from] = (offsets.nonce[from] || 0) + 1;
        offsets.balance[from] = (offsets.balance[from] || 0n) + cost;
      } else {
        toxic.push(tx.hash || tx.calculateHash());
      }
    }

    if (toxic.length) this.mempoolManager.remove(toxic);

    const block = new Block({
      index: this.chain.length,
      lastHash: last.hash,
      timestamp: Date.now(),
      transactions: validTxs,
      validator: validatorWallet.publicKey,
    });

    return (await this.addBlock(block)) ? block : null;
  }

  async addBlock(block) {
    const last = this.lastBlock();
    if (block.index !== this.chain.length || block.lastHash !== last.hash)
      return false;
    if (block.validator !== this.selectValidator(last.hash, block.validator))
      return false;

    let fees = 0n;
    const blockTxs = block.transactions.map((t) =>
      t instanceof Transaction ? t : new Transaction(t),
    );

    // Process standard txs
    for (const tx of blockTxs) {
      if (tx.type === "REWARD") continue;
      if (!this.applyTransaction(tx)) return false;
      fees += BigInt(tx.fee || 0n);
    }

    // Handle Reward
    const rewardAmount =
      this.economy.getReward(block.index) +
      this.economy.calculateFeeSplit(fees);
    const rewardTx =
      blockTxs.find((t) => t.type === "REWARD") ||
      new Transaction({
        from: "SYSTEM",
        to: block.validator,
        amount: rewardAmount,
        fee: 0n,
        type: "REWARD",
        timestamp: block.timestamp,
      });

    if (
      BigInt(rewardTx.amount) !== rewardAmount ||
      !this.applyTransaction(rewardTx)
    )
      return false;

    if (!block.transactions.find((t) => t.type === "REWARD")) {
      block.transactions.unshift(rewardTx);
      block.hash = new Block(block).calculateHash();
    }

    this.chain.push(block);
    this.mempoolManager.remove(
      block.transactions.map((t) => t.hash || t.calculateHash()),
    );
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
