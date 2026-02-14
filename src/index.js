import Blockchain from "./core/chain.js";
import Network from "./p2p/server.js";
import startAPI from "./api/server.js";

const PORT = process.env.P2P_PORT || 3000;
const API_PORT = process.env.API_PORT || 4000;
const PEERS = process.env.PEERS ? process.env.PEERS.split(",") : [];

const chain = new Blockchain();
await chain.init();

const p2p = new Network(chain, PORT, PEERS);
startAPI({ chain, p2p }, API_PORT);

console.log(`Node running: P2P=${PORT}, API=${API_PORT}`);
