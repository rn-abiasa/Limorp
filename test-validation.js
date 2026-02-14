import Blockchain from "./src/core/chain.js";
import Wallet from "./src/wallet/wallet.js";
import Transaction from "./src/core/transaction.js";

async function testValidation() {
  const chain = new Blockchain();
  const alice = Wallet.import(
    "alice alice alice alice alice alice alice alice alice alice alice alice",
  );
  const bob = Wallet.import("bob bob bob bob bob bob bob bob bob bob bob bob");

  // 1. Give Alice some starting balance
  chain.balances[alice.publicKey] = 1000n;
  console.log(
    `Starting balance Alice: ${chain.getBalance(alice.publicKey)} LMR`,
  );

  const createTx = (nonce, amount) => {
    const tx = new Transaction({
      from: alice.publicKey,
      to: bob.publicKey,
      amount,
      nonce,
      gas: 10,
      gasPrice: 1,
      type: "TRANSFER",
    });
    tx.sign(alice);
    return tx;
  };

  // Test 1: Sequence multiple transactions (Nonce 0, 1)
  console.log("\n--- Test 1: Multiple pending transactions ---");
  const tx1 = createTx(0, 100n);
  const added1 = chain.addTransaction(tx1);
  console.log(`Added tx1 (nonce 0, amt 100): ${added1}`);

  const tx2 = createTx(1, 100n);
  const added2 = chain.addTransaction(tx2);
  console.log(`Added tx2 (nonce 1, amt 100): ${added2}`);

  // Test 2: Invalid nonce (Nonce 3 instead of 2)
  console.log("\n--- Test 2: Invalid nonce ---");
  const tx3 = createTx(3, 100n);
  const added3 = chain.addTransaction(tx3);
  console.log(`Added tx3 (nonce 3 - gap): ${added3} (Expected: false)`);

  // Test 3: Double spending (Balance 1000, 200 pending, try spend 900)
  console.log("\n--- Test 3: Double spending prevention ---");
  const tx4 = createTx(2, 900n);
  const added4 = chain.addTransaction(tx4);
  console.log(`Added tx4 (nonce 2, amt 900): ${added4} (Expected: false)`);

  console.log(`\nFinal Mempool Size: ${chain.mempool.length}`);
}

testValidation();
