import { WebSocket, WebSocketServer } from "ws";

export default class Network {
  constructor(blockchain, port, peers = []) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
    this.server = new WebSocketServer({ port });
    this.server.on("connection", (ws) => this.connect(ws));

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
    if (this.sockets.find((s) => s.url === url)) return;

    const ws = new WebSocket(url);
    ws.on("open", () => {
      ws.url = url; // Store target URL for tracking
      this.connect(ws);
      // Save successfully connected peer to DB
      this.blockchain.addPeer(url);
    });
    ws.on("error", () => console.log(`Failed to connect to peer: ${url}`));
  }

  connect(ws) {
    this.sockets.push(ws);
    ws.on("message", (msg) => this.message(ws, msg));
    ws.on("close", () => {
      this.sockets = this.sockets.filter((s) => s !== ws);
    });

    // Handshake: Send chain AND current peer list
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

      if (type === "CHAIN") {
        await this.syncChain(data);
      } else if (type === "TRANSACTION") {
        if (this.blockchain.addTransaction(data)) {
          this.broadcast({ type: "TRANSACTION", data });
        }
      } else if (type === "BLOCK") {
        if (await this.blockchain.addBlock(data)) {
          this.broadcast({ type: "BLOCK", data });
        }
      } else if (type === "PEERS") {
        this.handlePeerDiscovery(data);
      }
    } catch (e) {
      console.error("Failed to process P2P message:", e.message);
    }
  }

  handlePeerDiscovery(peerList) {
    peerList.forEach((peer) => {
      if (peer !== this.publicAddr && !this.blockchain.peers.includes(peer)) {
        console.log(`Discovered new peer: ${peer}`);
        this.connectToPeer(peer);
      }
    });
  }

  async syncChain(incomingChain) {
    if (
      incomingChain.length > this.blockchain.chain.length &&
      this.blockchain.isValidChain(incomingChain)
    ) {
      this.blockchain.chain = incomingChain;
      await this.blockchain.save();
      this.broadcast({ type: "CHAIN", data: this.blockchain.chain });
    }
  }

  broadcast(msg) {
    this.sockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(JSON.stringify(msg));
      }
    });
  }
}
