import Blockchain from "../core/chain.js";
import Wallet from "../wallet/wallet.js";
import Transaction from "../core/transaction.js";
import Block from "../core/block.js";

// Mock BigInt toJSON for logging
BigInt.prototype.toJSON = function () {
  return this.toString();
};

async function test() {
  const chain = new Blockchain();
  // await chain.init(); // Bypass DB for this test to avoid LOCK errors
  chain.save = async () => {}; // Bypass DB save

  const { wallet: walletInstance } = Wallet.create();
  console.log("Wallet address:", walletInstance.publicKey);

  // Mint some money for the wallet (cheat state for testing)
  chain.state.balances[walletInstance.publicKey] = 1000n;

  console.log("--- TEST 1: Multiple transactions from same wallet ---");

  const tx1Data = {
    from: walletInstance.publicKey,
    to: "RECEIVER_1",
    amount: 10n,
    nonce: 0,
    fee: 1n,
  };
  const tx1 = new Transaction(tx1Data);
  tx1.sign(walletInstance);

  const res1 = chain.addTransaction(tx1);
  console.log("Tx1 result:", res1);
  if (res1 !== "SUCCESS") throw new Error("Tx1 failed");

  const tx2Data = {
    from: walletInstance.publicKey,
    to: "RECEIVER_2",
    amount: 20n,
    nonce: 1,
    fee: 1n,
  };
  const tx2 = new Transaction(tx2Data);
  tx2.sign(walletInstance);

  const res2 = chain.addTransaction(tx2);
  console.log("Tx2 result:", res2);
  if (res2 !== "SUCCESS") {
    console.error("Mempool size:", chain.mempoolManager.size);
    console.error(
      "Mempool hashes:",
      chain.mempoolManager.transactions.map((t) => t.hash),
    );
    throw new Error("Tx2 failed - likely due to deduplication issues");
  }

  console.log("Mempool size after 2 txs:", chain.mempoolManager.size);
  if (chain.mempoolManager.size !== 2) throw new Error("Mempool size mismatch");

  console.log("--- TEST 2: Mempool clearing after mining ---");

  const { wallet: validator } = Wallet.create();
  chain.registerValidator(validator.publicKey);

  // Create block
  const transactions = chain.mempoolManager.getSorted();
  const lastBlock = chain.lastBlock();

  const block = new Block({
    index: chain.chain.length,
    lastHash: lastBlock.hash,
    timestamp: Date.now(),
    transactions: transactions,
    validator: validator.publicKey,
  });

  block.hash = block.calculateHash();

  console.log("Adding block...");
  const addBlockRes = await chain.addBlock(block);
  console.log("Add block result:", addBlockRes);
  if (!addBlockRes) throw new Error("Block addition failed");

  console.log("Mempool size after block mined:", chain.mempoolManager.size);
  if (chain.mempoolManager.size !== 0) {
    console.error(
      "Mempool should be empty. Current transactions:",
      chain.mempoolManager.transactions,
    );
    throw new Error("Mempool not cleared");
  }

  console.log("--- SUCCESS: All tests passed ---");
}

test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
