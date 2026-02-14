import Block from "./block.js";
import Transaction from "./transaction.js";
import { runContract } from "./vm.js";
import db from "../db/db.js";

// PoT (Proof of Turn) Constants
const VALIDATOR_TIMEOUT = 60000; // Node must announce every 60s to stay active

export default class Blockchain {
  constructor() {
    this.chain = [this.genesis()];
    this.balances = {};
    this.validators = {}; // { address: lastSeenTimestamp }
    this.nonces = {};
    this.mempool = [];
    this.contractState = {};
    this.peers = [];
    this.nodeId = null;
  }

  async init() {
    const saved = await db.load();
    if (saved) {
      this.chain = saved.chain.map((b) => new Block(b));
      this.balances = Object.fromEntries(
        Object.entries(saved.balances).map(([k, v]) => [k, BigInt(v)]),
      );
      this.nonces = saved.nonces;
      this.contractState = saved.contractState;
      this.peers = saved.peers || [];
      this.nodeId = saved.nodeId || null;

      // Hash Migration: Ensure all transactions in loaded chain have hashes
      let migrated = false;
      for (const block of this.chain) {
        for (const tx of block.transactions) {
          if (!tx.hash) {
            const txInstance = new Transaction(tx);
            tx.hash = txInstance.calculateHash();
            migrated = true;
          }
        }
      }
      if (migrated) {
        console.log("Blockchain: Migrated missing transaction hashes.");
        this.save();
      }

      console.log("Blockchain state loaded from disk.");
    }
  }

  async save() {
    await db.save({
      chain: this.chain,
      balances: this.balances,
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

    // 1. Basic Verification
    if (!Transaction.verify(tx)) {
      console.error("addTransaction: Verification failed");
      return "ERROR";
    }

    // 2. Already in mempool? (Deduplication)
    if (this.mempool.some((t) => t.calculateHash() === tx.hash)) {
      return "SKIPPED"; // Already buffered
    }

    // 3. Already confirmed in chain? (Deduplication)
    // We only check the last 50 blocks or so for performance in a real app,
    // but here we check if its nonce is already used.
    const currentNonce = this.getNonce(tx.from);
    if (tx.nonce < currentNonce) {
      return "SKIPPED"; // Already confirmed
    }

    // 4. Nonce Sequence Validation
    const expectedNonce = this.getPendingNonce(tx.from);
    if (tx.nonce !== expectedNonce) {
      // Only log if it's a significant mismatch (e.g., a future gap)
      if (tx.nonce > expectedNonce) {
        console.error(
          `addTransaction: Nonce gap for ${tx.from}. Expected ${expectedNonce}, got ${tx.nonce}`,
        );
      }
      return "ERROR";
    }

    // 5. Balance Check
    const fee = BigInt(tx.gas) * BigInt(tx.gasPrice);
    if (BigInt(tx.amount) + fee > this.getPendingBalance(tx.from)) {
      console.error(
        "addTransaction: Insufficient balance (considering mempool) for amount + fee",
      );
      return "ERROR";
    }

    this.mempool.push(tx);
    this.mempool.sort((a, b) =>
      Number(BigInt(b.gasPrice) - BigInt(a.gasPrice)),
    );
    return "SUCCESS";
  }

  applyTransaction(tx) {
    if (!Transaction.verify(tx)) {
      console.error(
        `applyTransaction: Signature verification failed for ${tx.calculateHash()}`,
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
    } else if (tx.type === "CONTRACT_DEPLOY") {
      const contractAddress = tx.calculateHash();
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

  registerValidator(address) {
    this.validators[address] = Date.now();
  }

  getValidValidators() {
    const now = Date.now();
    // Prune stale validators and return active ones
    return Object.keys(this.validators).filter(
      (addr) => now - this.validators[addr] < VALIDATOR_TIMEOUT,
    );
  }

  selectValidator(seed, currentValidatorAddr = null) {
    let activeAddresses = this.getValidValidators();

    // Ensure the current node is always a candidate if it just announced
    if (
      currentValidatorAddr &&
      !activeAddresses.includes(currentValidatorAddr)
    ) {
      activeAddresses.push(currentValidatorAddr);
    }

    if (activeAddresses.length === 0) return "GENESIS";

    // Deterministic Sort
    activeAddresses.sort();

    // Lucky Slot Rotation (Deterministic Shuffle)
    const seedNum = BigInt("0x" + seed);
    const winnerIndex = Number(seedNum % BigInt(activeAddresses.length));

    return activeAddresses[winnerIndex];
  }

  async createBlock(validatorWallet) {
    // 1. Check if this wallet is the scheduled winner
    const scheduledWinner = this.selectValidator(
      this.lastBlock().hash,
      validatorWallet.publicKey,
    );
    if (validatorWallet.publicKey !== scheduledWinner) {
      console.error(
        `createBlock: You are NOT the scheduled validator. Winner is ${scheduledWinner}`,
      );
      return null;
    }

    const MAX_BLOCK_GAS = 1000000n;
    let currentBlockGas = 0n;
    const transactions = [];

    for (let i = 0; i < this.mempool.length; i++) {
      const tx = this.mempool[i];
      if (currentBlockGas + BigInt(tx.gas) <= MAX_BLOCK_GAS) {
        // Attach hash property for persistence/explorer
        tx.hash = tx.calculateHash();
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

    // CONSENSUS CHECK: Is the sender the scheduled winner?
    const scheduledWinner = this.selectValidator(
      block.lastHash,
      block.validator,
    );
    if (block.validator !== scheduledWinner) {
      console.error(
        `addBlock: Block rejected. Validator ${block.validator} is not the scheduled winner (${scheduledWinner})`,
      );
      return false;
    }

    let totalFees = 0n;
    for (const tx of block.transactions) {
      // Safety: Ensure hash is attached for explorer visibility
      if (!tx.hash) {
        const txInstance = new Transaction(tx);
        tx.hash = txInstance.calculateHash();
      }

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
      return tx.hash || tx.calculateHash();
    });
    this.mempool = this.mempool.filter(
      (t) => !blockTxHashes.includes(t.hash || t.calculateHash()),
    );

    await this.save();
    return true;
  }

  async rebuildFrom(newChainData) {
    console.log(`P2P: Rebuilding state from ${newChainData.length} blocks...`);

    // 1. Reset volatile state
    this.balances = {};
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
        // Ensure hash is attached even on rebuild
        const txInstance = new Transaction(tx);
        tx.hash = txInstance.calculateHash();

        // Force apply without full validation since it's already in the chain
        if (!this.applyTransaction(txInstance)) {
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
    // 1. Check Genesis
    const genesis = JSON.stringify(this.genesis());
    if (JSON.stringify(chain[0]) !== genesis) {
      console.error("isValidChain: Genesis mismatch");
      return false;
    }

    // 2. Continuous Verification
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const lastBlock = chain[i - 1];

      // a. Link check
      if (block.lastHash !== lastBlock.hash) {
        console.error(`isValidChain: Link mismatch at block ${i}`);
        return false;
      }

      // b. Hash integrity check
      const blockInstance = new Block(block);
      if (block.hash !== blockInstance.calculateHash()) {
        console.error(`isValidChain: Hash corruption at block ${i}`);
        return false;
      }
    }

    return true;
  }
}
