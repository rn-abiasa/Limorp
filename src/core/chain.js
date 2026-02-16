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
      const db = await import("../db/db.js").then((m) => m.default);
      const saved = await db.load();
      this.chain = [];
      for (let i = 0; i < saved.chain.length; i++) {
        this.chain.push(new Block(saved.chain[i]));
      }
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
    let maxNonce = 0;
    for (let i = 0; i < mempoolTxs.length; i++) {
      if (mempoolTxs[i].nonce > maxNonce) maxNonce = mempoolTxs[i].nonce;
    }
    return maxNonce + 1;
  }

  getPendingBalance(address) {
    let balance = this.getBalance(address);
    const pendingTxs = this.mempoolManager.filterBySender(address);
    let spent = 0n;
    for (let i = 0; i < pendingTxs.length; i++) {
      const tx = pendingTxs[i];
      spent += BigInt(tx.amount || 0);
      spent += BigInt(tx.fee || 0);
    }
    return balance - spent;
  }

  addTransaction(txData) {
    const tx = txData instanceof Transaction ? txData : new Transaction(txData);
    if (!Transaction.verify(tx)) return "ERROR";

    const currentNonce = this.getNonce(tx.from);
    if (tx.nonce < currentNonce) return "SKIPPED";

    const expectedNonce = this.getPendingNonce(tx.from);
    if (tx.nonce !== expectedNonce) return "ERROR";

    const minFee = this.getMinFee();
    if (BigInt(tx.fee) < minFee) return "ERROR";

    const cost = BigInt(tx.amount || 0) + BigInt(tx.fee || 0);
    if (cost > this.getPendingBalance(tx.from)) return "ERROR";

    tx.hash = tx.hash || tx.calculateHash();
    return this.mempoolManager.add(tx);
  }

  applyTransaction(tx) {
    if (!Transaction.verify(tx)) return false;
    const from = tx.from,
      to = tx.to;
    const amount = BigInt(tx.amount || 0),
      fee = BigInt(tx.fee || 0);
    const nonce = this.getNonce(from);

    if (from !== "SYSTEM") {
      if (tx.nonce !== nonce || this.getBalance(from) < amount + fee)
        return false;
      this.state.updateBalance(from, -(amount + fee));
      this.state.setNonce(from, nonce + 1);
    }

    if (["TRANSFER", "CONTRACT_CALL", "REWARD"].includes(tx.type)) {
      this.state.updateBalance(to, amount);
    }

    if (tx.type === "CONTRACT_DEPLOY") {
      try {
        const initState = runContract(tx.code, {}, tx.input, from, 0n);
        this.state.setContract(tx.calculateHash(), {
          code: tx.code,
          state: initState,
          metadata: { creator: from, timestamp: Date.now() },
        });
      } catch (e) {
        console.error("Deploy Fail:", e.message);
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
        console.error("Call Fail:", e.message);
      }
    }
    return true;
  }

  async createBlock(wallet) {
    const last = this.lastBlock();
    if (wallet.publicKey !== this.selectValidator(last.hash, wallet.publicKey))
      return null;

    const validTxs = [],
      toxic = [];
    const nn = {},
      bb = {};

    for (const tx of this.mempoolManager.getSorted()) {
      if (validTxs.length >= 50) break;
      const from = tx.from;
      const nonce = this.getNonce(from) + (nn[from] || 0);
      const balance = this.getBalance(from) - (bb[from] || 0n);
      const cost = BigInt(tx.amount || 0) + BigInt(tx.fee || 0);

      if (tx.nonce === nonce && cost <= balance && Transaction.verify(tx)) {
        validTxs.push(tx);
        nn[from] = (nn[from] || 0) + 1;
        bb[from] = (bb[from] || 0n) + cost;
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
      validator: wallet.publicKey,
    });
    return (await this.addBlock(block)) ? block : null;
  }

  async addBlock(block) {
    const last = this.lastBlock();
    if (block.index !== this.chain.length || block.lastHash !== last.hash)
      return false;
    if (block.validator !== this.selectValidator(last.hash, block.validator))
      return false;

    let totalFees = 0n;
    const txs = [];
    for (let i = 0; i < block.transactions.length; i++) {
      const t = block.transactions[i];
      txs.push(t instanceof Transaction ? t : new Transaction(t));
    }

    for (const tx of txs) {
      if (tx.type === "REWARD") continue;
      if (!this.applyTransaction(tx)) return false;
      totalFees += BigInt(tx.fee || 0);
    }

    const reward =
      this.economy.getReward(block.index) +
      this.economy.calculateFeeSplit(totalFees);
    let rewardTx = null;
    for (const tx of txs) {
      if (tx.type === "REWARD") rewardTx = tx;
    }

    if (!rewardTx) {
      rewardTx = new Transaction({
        from: "SYSTEM",
        to: block.validator,
        amount: reward,
        fee: 0n,
        type: "REWARD",
        timestamp: block.timestamp,
      });
      block.transactions.unshift(rewardTx);
      block.hash = new Block(block).calculateHash();
    }

    if (BigInt(rewardTx.amount) !== reward || !this.applyTransaction(rewardTx))
      return false;

    this.chain.push(block);
    const hashes = [];
    for (const tx of block.transactions) {
      hashes.push(tx.hash || tx.calculateHash());
    }
    this.mempoolManager.remove(hashes);
    await this.save();
    return true;
  }

  async rebuildFrom(data) {
    this.state.reset();
    this.chain = [this.genesis()];
    for (let i = 1; i < data.length; i++) {
      const b = new Block(data[i]);
      if (b.lastHash !== this.lastBlock().hash) return false;
      for (const txData of b.transactions) {
        const tx = new Transaction(txData);
        tx.hash = tx.calculateHash();
        this.applyTransaction(tx);
      }
      this.chain.push(b);
    }
    await this.save();
    return true;
  }

  isValidChain(chain) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(this.genesis()))
      return false;
    for (let i = 1; i < chain.length; i++) {
      const b = chain[i],
        prev = chain[i - 1];
      if (b.lastHash !== prev.hash) return false;
      if (b.hash !== new Block(b).calculateHash()) return false;
    }
    return true;
  }

  addPeer(p) {
    for (let i = 0; i < this.peers.length; i++) {
      if (this.peers[i] === p) return;
    }
    this.peers.push(p);
    this.save();
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
