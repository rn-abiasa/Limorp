import Blockchain from "./src/core/chain.js";
import Transaction from "./src/core/transaction.js";
import Wallet from "./src/wallet/wallet.js";

async function verify() {
  const chain = new Blockchain();
  await chain.init();
  const { wallet: validator } = Wallet.create();
  const { wallet: user1 } = Wallet.create();
  const { wallet: user2 } = Wallet.create();

  console.log("--- Initializing Genesis Balance ---");
  chain.balances[user1.publicKey] = 1000n;
  console.log(`User1 balance: ${chain.getBalance(user1.publicKey)}`);

  console.log("\n--- Testing Transfer ---");
  const tx1 = new Transaction({
    from: user1.publicKey,
    to: user2.publicKey,
    amount: 100n,
    nonce: 0,
  });
  tx1.sign(user1);

  if (chain.addTransaction(tx1)) {
    console.log("Transaction added to mempool");
    const block1 = chain.createBlock(validator);
    if (block1) {
      console.log("Block 1 created with transfer");
      console.log(`User1 balance: ${chain.getBalance(user1.publicKey)}`);
      console.log(`User2 balance: ${chain.getBalance(user2.publicKey)}`);
      console.log(
        `Validator balance (Reward): ${chain.getBalance(validator.publicKey)}`,
      );
    } else {
      console.error("Failed to create block 1");
    }
  } else {
    console.error("Failed to add transaction tx1");
  }

  console.log("\n--- Testing Staking ---");
  const stakeTx = new Transaction({
    from: user1.publicKey,
    to: "SYSTEM",
    amount: 500n,
    nonce: 1,
    type: "STAKE",
  });
  stakeTx.sign(user1);
  chain.addTransaction(stakeTx);
  chain.createBlock(validator);
  console.log(`User1 Stake: ${chain.stakes[user1.publicKey] || 0n}`);
  console.log(`User1 Balance: ${chain.getBalance(user1.publicKey)}`);

  console.log("\n--- Testing Contract Deployment ---");
  const contractCode = `
    if (input.method === "increment") {
      state.count = (state.count || 0) + 1;
    }
  `;
  const deployTx = new Transaction({
    from: user1.publicKey,
    to: "0",
    amount: 0n,
    nonce: 2,
    type: "CONTRACT_DEPLOY",
    code: contractCode,
  });
  deployTx.sign(user1);
  const contractAddress = deployTx.hash();
  chain.addTransaction(deployTx);
  chain.createBlock(validator);
  console.log(`Contract deployed at: ${contractAddress}`);

  console.log("\n--- Testing Contract Call ---");
  const callTx = new Transaction({
    from: user1.publicKey,
    to: contractAddress,
    amount: 0n,
    nonce: 3,
    type: "CONTRACT_CALL",
    input: { method: "increment" },
  });
  callTx.sign(user1);
  chain.addTransaction(callTx);
  chain.createBlock(validator);
  console.log(
    `Contract state after increment: ${JSON.stringify(chain.contractState[contractAddress].state)}`,
  );

  console.log("\n--- Verification Complete ---");
}

verify().catch(console.error);
