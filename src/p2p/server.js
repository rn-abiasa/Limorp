import { WebSocket } from "ws";
import crypto from "crypto";
import ConnectionManager from "./connection.js";
import MessageHandler from "./handler.js";
import DiscoveryManager from "./discovery.js";
import SyncManager from "./sync.js";

// BigInt serialization fix for P2P messages
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export default class Network {
  constructor(blockchain, port, peers = []) {
    this.blockchain = blockchain;
    this.port = port;
    this.publicAddr = process.env.PUBLIC_ADDR || `ws://localhost:${port}`;
    this.validatorAddress = null;

    // Node Identity
    if (!blockchain.nodeId) {
      blockchain.nodeId = crypto.randomBytes(8).toString("hex");
      blockchain.save();
    }
    this.nodeId = blockchain.nodeId;

    // Modules
    this.connections = new ConnectionManager(port, (ws) => this.onConnect(ws));
    this.handler = new MessageHandler(this, blockchain);
    this.discovery = new DiscoveryManager(this, blockchain, this.publicAddr);
    this.sync = new SyncManager(this, blockchain);
    this.isSyncing = false;

    // Initial Connections
    const allPeers = [...new Set([...peers, ...blockchain.peers])];
    allPeers.forEach((p) => this.connectToPeer(p));

    this.discovery.startReconnectionLoop();
  }

  setValidatorAddress(addr) {
    this.validatorAddress = addr;
  }

  connectToPeer(url) {
    if (
      url === this.publicAddr ||
      this.connections.sockets.find((s) => s.remoteUrl === url)
    )
      return;

    const ws = new WebSocket(url);
    ws.on("open", () => {
      ws.remoteUrl = url;
      this.onConnect(ws);
      this.discovery.addPeer(url);
    });
    ws.on("error", () => {});
  }

  onConnect(ws) {
    this.connections.addSocket(ws);
    ws.on("message", (msg) => this.handler.handle(ws, msg));
    ws.on("close", () => this.connections.removeSocket(ws));

    // Send STATUS (Production-style handshake)
    ws.send(
      JSON.stringify({
        type: "STATUS",
        data: {
          nodeId: this.nodeId,
          publicAddr: this.publicAddr,
          height: this.blockchain.chain.length,
          lastHash: this.blockchain.lastBlock().hash,
        },
      }),
    );
  }

  handleStatus(ws, data) {
    if (data.nodeId === this.nodeId) {
      ws.close();
      return;
    }
    ws.nodeId = data.nodeId;
    ws.remoteUrl = data.publicAddr;
    ws.height = data.height || 0;
    ws.lastHash = data.lastHash;

    // Trigger sync check
    this.sync.checkSync(ws);

    // Discovery auto-add
    if (ws.remoteUrl) this.discovery.addPeer(ws.remoteUrl);
  }

  broadcast(msg, originWs = null) {
    this.connections.broadcast(msg, originWs, this.publicAddr);
  }
}
