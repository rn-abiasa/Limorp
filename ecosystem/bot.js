// Global Fix for BigInt JSON serialization
BigInt.prototype.toJSON = function () {
  return this.toString();
};

import fs from "fs";
import path from "path";
import Wallet from "../src/wallet/wallet.js";
import Transaction from "../src/core/transaction.js";

// === CONFIGURATION ===
const API_URL = "http://localhost:4000";
const BOT_COUNT = 5;
const BOT_FOLDER = path.join(process.cwd(), "bot");
const INTERVAL = 2000; // 20 seconds between bot actions
const MIN_BALANCE_FOR_ACTION = 5n; // Minimum balance to consider sending
const SEND_AMOUNT = 100n; // Fixed amount to send for simplicity
const GAS_FEE_LIMIT = 20n; // Safety buffer for fees

async function apiGet(route) {
  const res = await fetch(`${API_URL}${route}`);
  if (!res.ok) throw new Error(`API GET ${route} failed`);
  return res.json();
}

async function apiPost(route, body) {
  const res = await fetch(`${API_URL}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST ${route} failed`);
  return res.json();
}

async function initBots() {
  if (!fs.existsSync(BOT_FOLDER)) {
    fs.mkdirSync(BOT_FOLDER, { recursive: true });
  }

  const bots = [];
  console.log("\n🤖 --- Ecosystem Bots Initializing ---");

  for (let i = 1; i <= BOT_COUNT; i++) {
    const botFile = path.join(BOT_FOLDER, `wallet_bot${i}.json`);
    let botData;

    if (fs.existsSync(botFile)) {
      botData = JSON.parse(fs.readFileSync(botFile, "utf-8"));
    } else {
      // Use API to create as requested
      const response = await apiPost("/wallet/create", {});
      botData = {
        name: `bot${i}`,
        mnemonic: response.mnemonic,
        address: response.wallet.publicKey,
      };
      fs.writeFileSync(botFile, JSON.stringify(botData, null, 2));
    }

    const wallet = Wallet.import(botData.mnemonic);
    bots.push({ ...botData, wallet });
    console.log(`[BOT ${i}] ${botData.address}`);
  }
  console.log("---------------------------------------\n");
  return bots;
}

async function botAction(bot, allBots) {
  try {
    // 1. Check Balance
    const { balance } = await apiGet(`/balance/${bot.address}`);
    const balanceBig = BigInt(balance);

    if (balanceBig < MIN_BALANCE_FOR_ACTION + GAS_FEE_LIMIT) {
      return; // Not enough balance
    }

    // 2. Pick Random Recipient (who isn't me)
    const otherBots = allBots.filter((b) => b.address !== bot.address);
    const target = otherBots[Math.floor(Math.random() * otherBots.length)];

    // 3. Get Nonce and Gas
    const { nonce } = await apiGet(`/nonce/${bot.address}`);
    const { suggestedGasPrice } = await apiGet("/gas-price");

    // 4. Create and Sign Transaction
    const tx = new Transaction({
      from: bot.address,
      to: target.address,
      amount: SEND_AMOUNT,
      nonce: nonce,
      gasPrice: BigInt(suggestedGasPrice),
    });
    tx.sign(bot.wallet);

    // 5. Submit
    await apiPost("/transact", tx);

    // Success - Keep it quiet as requested
  } catch (err) {
    console.error(`❌ [BOT ERROR] ${bot.name}: ${err.message}`);
  }
}

async function run() {
  try {
    const bots = await initBots();

    console.log("🚀 Ecosystem started! Bots are watching their balances...");

    setInterval(async () => {
      // Pick one random bot to try an action each interval to avoid clashing nonces too much
      const agent = bots[Math.floor(Math.random() * bots.length)];
      await botAction(agent, bots);
    }, INTERVAL);
  } catch (err) {
    console.error("CRITICAL: Failed to start ecosystem bots:", err.message);
    process.exit(1);
  }
}

run();
