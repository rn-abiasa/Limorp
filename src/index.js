// Global Fix for BigInt JSON serialization
BigInt.prototype.toJSON = function () {
  return this.toString();
};

import Blockchain from "./core/chain.js";
import Network from "./p2p/server.js";
import startAPI from "./api/server.js";
import Wallet from "./wallet/wallet.js";
import WalletStore from "./wallet/store.js";
import { getLocalIp } from "./utils/network.js";

const PORT = process.env.P2P_PORT || 3000;
const API_PORT = process.env.API_PORT || 4000;
let validatorMnemonic = process.env.VALIDATOR_MNEMONIC;

// Auto-discover local IP if public address is not set
const localIp = getLocalIp();
const publicAddr = process.env.PUBLIC_ADDR || `ws://${localIp}:${PORT}`;
process.env.PUBLIC_ADDR = publicAddr; // Set for consistency in other modules

// Hardcoded stable nodes for initial connection (Bootnodes)
const BOOTNODES = [
  "ws://192.168.100.174:3000", // Example Seed Node
];

const envPeers = process.env.PEERS ? process.env.PEERS.split(",") : [];
const ALL_PEERS = [...new Set([...envPeers, ...BOOTNODES])];

const chain = new Blockchain();
await chain.init();

const p2p = new Network(chain, PORT, ALL_PEERS);
startAPI({ chain, p2p }, API_PORT);

console.log(
  `Node running: P2P=ws://localhost:${PORT}, API=http://localhost:${API_PORT}`,
);

// Automated Block Production Loop (PoS/PoT Evolution)
async function startMiningLoop() {
  // 1. Discover Validator Identity
  if (!validatorMnemonic) {
    try {
      const wallets = await WalletStore.getWallets();
      if (wallets["default"]) {
        validatorMnemonic = wallets["default"];
        console.log("PoT: Auto-discovered 'default' wallet for validation.");
      }
    } catch (err) {}
  }

  if (validatorMnemonic) {
    const wallet = Wallet.import(validatorMnemonic);
    console.log(`PoT: Automated validator active for ${wallet.publicKey}`);
    p2p.setValidatorAddress(wallet.publicKey);

    // IDENTITY ANNOUNCEMENT (PoT Heartbeat)
    // Broadcast identity every 30s to stay in the Lucky Slot pool
    setInterval(() => {
      chain.registerValidator(wallet.publicKey);
      p2p.broadcast({ type: "ANNOUNCE", data: { address: wallet.publicKey } });
    }, 30000);
    // Initial announcement
    chain.registerValidator(wallet.publicKey);
    p2p.broadcast({ type: "ANNOUNCE", data: { address: wallet.publicKey } });

    setInterval(async () => {
      try {
        // Tetap produksi blok meskipun mempool kosong untuk minting reward

        const lastHash = chain.lastBlock().hash;
        const scheduledWinner = chain.selectValidator(
          lastHash,
          wallet.publicKey,
        );

        if (wallet.publicKey === scheduledWinner) {
          console.log(
            `PoT: It's my turn! Producing block #${chain.chain.length}...`,
          );
          const block = await chain.createBlock(wallet);
          if (block) {
            p2p.broadcast({ type: "BLOCK", data: block });
            console.log(`PoT: Block #${block.index} produced and broadcasted.`);
          }
        } else {
          // Diagnostic log (10% chance to avoid spam)
          if (Math.random() < 0.1) {
            console.log(
              `PoT: Waiting for slot... Next Winner: ${scheduledWinner.slice(0, 10)}...`,
            );
          }
        }
      } catch (err) {
        console.error("PoT: Automated block production failed:", err.message);
      }
    }, 10000); // Check every 10 seconds
  } else {
    console.log("PoT: Running in Observer Mode (No identity found).");
    setTimeout(startMiningLoop, 30000);
  }
}

startMiningLoop();
