import Blockchain from "./core/chain.js";
import Network from "./p2p/server.js";
import startAPI from "./api/server.js";

const PORT = process.env.P2P_PORT || 3000;
const API_PORT = process.env.API_PORT || 4000;

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

console.log(`Node running: P2P=${PORT}, API=${API_PORT}`);
