import Blockchain from "./src/core/chain.js";
import Transaction from "./src/core/transaction.js";
import Wallet from "./src/wallet/wallet.js";
import db from "./src/db/db.js";

async function verifyPersistence() {
  const mnemonic =
    "test test test test test test test test test test test junk";
  const wallet = Wallet.import(mnemonic);
  const chain = new Blockchain();
  await chain.init();

  console.log(`Checking balance for ${wallet.publicKey}`);
  const initialBalance = chain.getBalance(wallet.publicKey);
  console.log(`Current Balance: ${initialBalance}`);

  if (initialBalance === 0n) {
    console.log("First run: Initializing balance and creating a block.");
    chain.balances[wallet.publicKey] = 1000n;
    const tx = new Transaction({
      from: wallet.publicKey,
      to: "0",
      amount: 0n,
      nonce: 0,
      type: "TRANSFER",
    });
    tx.sign(wallet);
    chain.addTransaction(tx);
    await chain.createBlock(wallet);
    console.log("Block created. Run this script again to verify persistence.");
  } else {
    console.log("Second run: Data persistent!");
  }

  await db.close();
}

verifyPersistence().catch(console.error);
