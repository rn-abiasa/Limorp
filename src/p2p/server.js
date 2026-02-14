import { WebSocket, WebSocketServer } from "ws";
import Block from "../core/block.js";

export default class Network {
  constructor(blockchain, port, peers = []) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
    this.server = new WebSocketServer({ port });
    this.server.on("connection", (ws) => this.connect(ws));
    console.log(`P2P: Server listening on port ${port}`);

    // My own address (simplified, assuming localhost for now or provided via env/arg)
    this.publicAddr = process.env.PUBLIC_ADDR || `ws://localhost:${port}`;

    // Connect to initial peers AND saved peers from database
    const allPeers = [...new Set([...peers, ...blockchain.peers])];
    allPeers.forEach((peer) => {
      if (peer !== this.publicAddr) {
        this.connectToPeer(peer);
      }
    });
  }

  connectToPeer(url) {
    // Avoid connecting to self or already connected peers
    if (url === this.publicAddr) return;
    if (this.sockets.find((s) => s.remoteUrl === url)) return;

    const ws = new WebSocket(url);
    ws.on("open", () => {
      ws.remoteUrl = url; // Use custom property to avoid conflict
      console.log(`P2P: Successfully connected to peer: ${url}`);
      this.connect(ws);
      // Save successfully connected peer to DB
      this.blockchain.addPeer(url);
    });
    ws.on("error", () => console.log(`Failed to connect to peer: ${url}`));
  }

  connect(ws) {
    this.sockets.push(ws);
    console.log(
      `P2P: New connection established. Active peers: ${this.sockets.length}`,
    );

    ws.on("message", (msg) => this.message(ws, msg));
    ws.on("close", () => {
      this.sockets = this.sockets.filter((s) => s !== ws);
      console.log(
        `P2P: Connection closed. Active peers: ${this.sockets.length}`,
      );
    });

    // Handshake: Identify myself and send chain/peers
    ws.send(JSON.stringify({ type: "HANDSHAKE", data: this.publicAddr }));
    ws.send(JSON.stringify({ type: "CHAIN", data: this.blockchain.chain }));
    ws.send(
      JSON.stringify({
        type: "PEERS",
        data: [...this.blockchain.peers, this.publicAddr],
      }),
    );
  }

  async message(ws, msg) {
    try {
      const { type, data } = JSON.parse(msg);
      console.log(`P2P [INCOM]: ${type} from ${ws.remoteUrl || "unknown"}`);

      if (type === "HANDSHAKE") {
        ws.remoteUrl = data;
        console.log(`P2P: Peer identified as ${data}`);
      } else if (type === "CHAIN") {
        await this.syncChain(data, ws);
      } else if (type === "TRANSACTION") {
        if (this.blockchain.addTransaction(data)) {
          console.log(`P2P: Valid Tx received (${data.hash}), broadcasting...`);
          this.broadcast({ type: "TRANSACTION", data });
        } else {
          console.error(`P2P: Incoming Tx rejected (${data.hash})`);
        }
      } else if (type === "BLOCK") {
        if (await this.blockchain.addBlock(new Block(data))) {
          console.log(
            `P2P: Valid Block received (#${data.index}), broadcasting...`,
          );
          this.broadcast({ type: "BLOCK", data });
        } else {
          console.error(`P2P: Incoming Block rejected (#${data.index})`);
        }
      } else if (type === "PEERS") {
        this.handlePeerDiscovery(data);
      }
    } catch (e) {
      console.error("Failed to process P2P message:", e.message);
    }
  }

  handlePeerDiscovery(peerList) {
    console.log(`P2P: Received peer list (${peerList.length} addresses)`);
    peerList.forEach((peer) => {
      if (peer !== this.publicAddr && !this.blockchain.peers.includes(peer)) {
        console.log(`P2P: Discovered new peer: ${peer}`);
        this.connectToPeer(peer);
      }
    });
  }

  async syncChain(incomingChain, ws) {
    const localLen = this.blockchain.chain.length;
    const incomingLen = incomingChain.length;

    if (incomingLen > localLen && this.blockchain.isValidChain(incomingChain)) {
      console.log(
        `P2P: Incoming chain is longer (${incomingLen} > ${localLen}) from ${ws.remoteUrl || "unknown"}. Syncing...`,
      );
      const success = await this.blockchain.rebuildFrom(incomingChain);
      if (success) {
        this.broadcast({ type: "CHAIN", data: this.blockchain.chain });
      }
    } else {
      console.log(
        `P2P: Sync skipped. Local: ${localLen}, Incoming: ${incomingLen}, Valid: ${this.blockchain.isValidChain(incomingChain)}`,
      );
    }
  }

  broadcast(msg) {
    console.log(`P2P [BROAD]: ${msg.type} to ${this.sockets.length} peers`);
    this.sockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(JSON.stringify(msg));
      }
    });
  }
}
