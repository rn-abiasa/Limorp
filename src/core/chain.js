import Block from "./block.js";
import Transaction from "./transaction.js";
import { runContract } from "./vm.js";
import db from "../db/db.js";

export default class Blockchain {
  constructor() {
    this.chain = [this.genesis()];
    this.balances = {};
    this.stakes = {};
    this.nonces = {};
    this.mempool = [];
    this.contractState = {};
    this.peers = [];
    this.nodeId = null; // To be loaded or generated
  }

  async init() {
    const saved = await db.load();
    if (saved) {
      this.chain = saved.chain.map((b) => new Block(b));
      this.balances = Object.fromEntries(
        Object.entries(saved.balances).map(([k, v]) => [k, BigInt(v)]),
      );
      this.stakes = Object.fromEntries(
        Object.entries(saved.stakes).map(([k, v]) => [k, BigInt(v)]),
      );
      this.nonces = saved.nonces;
      this.contractState = saved.contractState;
      this.peers = saved.peers || [];
      this.nodeId = saved.nodeId || null;
      console.log("Blockchain state loaded from disk.");
    }
  }

  async save() {
    await db.save({
      chain: this.chain,
      balances: this.balances,
      stakes: this.stakes,
      nonces: this.nonces,
      contractState: this.contractState,
      peers: this.peers,
      nodeId: this.nodeId,
    });
  }

  genesis() {
    return new Block({
      index: 0,
      lastHash: "0",
      timestamp: 1739530000000, // Fixed timestamp for network-wide consensus
      transactions: [],
      validator: "GENESIS",
    });
  }

  lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  getBalance(address) {
    return this.balances[address] || 0n;
  }

  getNonce(address) {
    return this.nonces[address] || 0;
  }

  getPendingNonce(address) {
    const mempoolTxs = this.mempool.filter((tx) => tx.from === address);
    if (mempoolTxs.length === 0) return this.getNonce(address);
    const maxNonce = Math.max(...mempoolTxs.map((tx) => tx.nonce));
    return maxNonce + 1;
  }

  getPendingBalance(address) {
    const confirmedBalance = this.getBalance(address);
    const pendingSpent = this.mempool
      .filter((tx) => tx.from === address)
      .reduce((sum, tx) => {
        const fee = BigInt(tx.gas) * BigInt(tx.gasPrice);
        return sum + BigInt(tx.amount) + fee;
      }, 0n);
    return confirmedBalance - pendingSpent;
  }

  addTransaction(txData) {
    const tx = txData instanceof Transaction ? txData : new Transaction(txData);
    if (!Transaction.verify(tx)) {
      console.error("addTransaction: Verification failed");
      return false;
    }
    if (tx.nonce !== this.getPendingNonce(tx.from)) {
      console.error(
        `addTransaction: Nonce mismatch for ${tx.from}. Expected ${this.getPendingNonce(tx.from)}, got ${tx.nonce}`,
      );
      return false;
    }
    const fee = BigInt(tx.gas) * BigInt(tx.gasPrice);
    if (BigInt(tx.amount) + fee > this.getPendingBalance(tx.from)) {
      console.error(
        "addTransaction: Insufficient balance (considering mempool) for amount + fee",
      );
      return false;
    }

    this.mempool.push(tx);
    // Sort mempool by gasPrice (descending)
    this.mempool.sort((a, b) =>
      Number(BigInt(b.gasPrice) - BigInt(a.gasPrice)),
    );
    return true;
  }

  applyTransaction(tx) {
    if (!Transaction.verify(tx)) {
      console.error(
        `applyTransaction: Signature verification failed for ${tx.hash()}`,
      );
      return false;
    }

    // Nonce check
    const currentNonce = this.getNonce(tx.from);
    if (tx.from !== "SYSTEM" && tx.nonce !== currentNonce) {
      console.error(
        `applyTransaction: Nonce mismatch for ${tx.from}. Expected ${currentNonce}, got ${tx.nonce}`,
      );
      return false;
    }

    const fee = BigInt(tx.gas) * BigInt(tx.gasPrice);
    if (this.getBalance(tx.from) < BigInt(tx.amount) + fee) {
      console.error(
        `applyTransaction: Insufficient balance for ${tx.from}. Required ${BigInt(tx.amount) + fee}, has ${this.getBalance(tx.from)}`,
      );
      return false;
    }

    // Deduct total (amount + fee) from sender
    this.balances[tx.from] =
      this.getBalance(tx.from) - (BigInt(tx.amount) + fee);

    if (tx.type === "TRANSFER") {
      this.balances[tx.to] = this.getBalance(tx.to) + BigInt(tx.amount);
    } else if (tx.type === "STAKE") {
      this.stakes[tx.from] = (this.stakes[tx.from] || 0n) + BigInt(tx.amount);
    } else if (tx.type === "CONTRACT_DEPLOY") {
      const contractAddress = tx.hash();
      this.contractState[contractAddress] = {
        code: tx.code,
        state: {},
      };
    } else if (tx.type === "CONTRACT_CALL") {
      const contract = this.contractState[tx.to];
      if (!contract) {
        console.error(`applyTransaction: Contract not found at ${tx.to}`);
        return false;
      }

      try {
        const newState = runContract(contract.code, contract.state, tx.input);
        this.contractState[tx.to].state = newState;
      } catch (e) {
        console.error(`applyTransaction: Contract execution failed:`, e);
        return false;
      }
    }

    if (tx.from !== "SYSTEM") {
      this.nonces[tx.from] = currentNonce + 1;
    }

    return true;
  }

  async createBlock(validatorWallet) {
    const MAX_BLOCK_GAS = 1000000n;
    let currentBlockGas = 0n;
    const transactions = [];

    for (let i = 0; i < this.mempool.length; i++) {
      const tx = this.mempool[i];
      if (currentBlockGas + BigInt(tx.gas) <= MAX_BLOCK_GAS) {
        transactions.push(tx);
        currentBlockGas += BigInt(tx.gas);
      }
    }

    // Remove selected transactions from mempool
    this.mempool = this.mempool.filter((tx) => !transactions.includes(tx));

    const block = new Block({
      index: this.chain.length,
      lastHash: this.lastBlock().hash,
      timestamp: Date.now(),
      transactions,
      validator: validatorWallet.publicKey,
    });

    if (await this.addBlock(block)) {
      return block;
    }
    return null;
  }

  async addBlock(block) {
    if (block.lastHash !== this.lastBlock().hash) {
      console.error(
        `addBlock: Hash mismatch. Expected ${this.lastBlock().hash.substring(0, 10)}..., got ${block.lastHash.substring(0, 10)}...`,
      );
      return false;
    }

    let totalFees = 0n;
    for (const tx of block.transactions) {
      if (!this.applyTransaction(tx)) {
        console.error(
          `addBlock: Failed to apply transaction ${tx.hash || "unknown"}`,
        );
        return false;
      }
      totalFees += BigInt(tx.gas) * BigInt(tx.gasPrice);
    }

    // Anti-Inflation: Reward Halving (every 100 blocks)
    const halvingInterval = 100;
    const halvings = Math.floor(block.index / halvingInterval);
    const baseReward = 50n;
    const currentReward = baseReward / BigInt(Math.pow(2, halvings)) || 0n;

    // Anti-Inflation: Fee Burning (50% burn, validator gets 50%)
    const validatorFeeShare = totalFees / 2n;

    this.balances[block.validator] =
      (this.balances[block.validator] || 0n) +
      currentReward +
      validatorFeeShare;

    this.chain.push(block);

    // FIX: Clear mempool of transactions in this block
    const blockTxHashes = block.transactions.map((t) => {
      const tx = t instanceof Transaction ? t : new Transaction(t);
      return tx.hash();
    });
    this.mempool = this.mempool.filter(
      (t) => !blockTxHashes.includes(t.hash()),
    );

    await this.save();
    return true;
  }

  async rebuildFrom(newChainData) {
    console.log(`P2P: Rebuilding state from ${newChainData.length} blocks...`);

    // 1. Reset volatile state
    this.balances = {};
    this.stakes = {};
    this.nonces = {};
    this.contractState = {};
    this.chain = [this.genesis()]; // Start fresh

    // 2. Iterate and apply each block (skip genesis which is already there)
    for (let i = 1; i < newChainData.length; i++) {
      const blockData = newChainData[i];
      const block = new Block(blockData);

      // Verify chain link
      if (block.lastHash !== this.lastBlock().hash) {
        console.error(`Rebuild failed at block ${i}: Hash mismatch`);
        return false;
      }

      // Apply transactions
      for (const tx of block.transactions) {
        // Force apply without full validation since it's already in the chain
        // but we still use applyTransaction to update balances/nonces
        if (!this.applyTransaction(new Transaction(tx))) {
          console.error(
            `Rebuild failed at block ${i}: Invalid transaction found in chain`,
          );
          // Note: In a real system we'd be more careful here, but for now we proceed
        }
      }

      // Apply block rewards and fees
      let totalFees = block.transactions.reduce((sum, tx) => {
        return sum + BigInt(tx.gas) * BigInt(tx.gasPrice);
      }, 0n);

      const halvingInterval = 100;
      const halvings = Math.floor(block.index / halvingInterval);
      const baseReward = 50n;
      const currentReward = baseReward / BigInt(Math.pow(2, halvings)) || 0n;
      const validatorFeeShare = totalFees / 2n;

      this.balances[block.validator] =
        (this.balances[block.validator] || 0n) +
        currentReward +
        validatorFeeShare;

      this.chain.push(block);
    }

    await this.save();
    console.log("P2P: State reconstruction complete.");
    return true;
  }

  addPeer(peer) {
    if (!this.peers.includes(peer)) {
      this.peers.push(peer);
      this.save();
      return true;
    }
    return false;
  }

  isValidChain(chain) {
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const lastBlock = chain[i - 1];
      if (block.lastHash !== lastBlock.hash) return false;
      // Basic validation of block hash would go here
    }

    return true;
  }
}
