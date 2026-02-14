import { WebSocket, WebSocketServer } from "ws";
import crypto from "crypto";
import Block from "../core/block.js";
import Transaction from "../core/transaction.js";
import { bigIntReplacer } from "../utils/network.js";

export default class Network {
  constructor(blockchain, port, peers = []) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
    this.server = new WebSocketServer({ port });
    this.server.on("connection", (ws) => this.connect(ws));

    // Persistent identity
    if (!blockchain.nodeId) {
      blockchain.nodeId = crypto.randomBytes(8).toString("hex");
      blockchain.save(); // Persist the new ID
    }
    this.nodeId = blockchain.nodeId;

    console.log(
      `P2P: Server listening on port ${port} (NodeID: ${this.nodeId})`,
    );

    // My own address (dynamically determined later if possible)
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

    // Check if the URL is just another name for localhost/myself
    const isLocal =
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.includes("0.0.0.0");
    const samePort = url.endsWith(`:${this.port}`);

    if ((isLocal && samePort) || url === this.publicAddr) {
      return; // Absolute skip for self-connections
    }

    if (this.sockets.find((s) => s.remoteUrl === url)) return;

    const ws = new WebSocket(url);
    ws.on("open", () => {
      ws.remoteUrl = url; // Use custom property to avoid conflict
      this.connect(ws);
      // Save successfully connected peer to DB
      this.blockchain.addPeer(url);
    });
    ws.on("error", () => {
      // Quietly fail for bootnodes if they are down/self
    });
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
    ws.send(
      JSON.stringify(
        {
          type: "HANDSHAKE",
          data: {
            nodeId: this.nodeId,
            publicAddr: this.publicAddr,
          },
        },
        bigIntReplacer,
      ),
    );
    ws.send(
      JSON.stringify(
        { type: "CHAIN", data: this.blockchain.chain },
        bigIntReplacer,
      ),
    );
    ws.send(
      JSON.stringify(
        {
          type: "PEERS",
          data: [...this.blockchain.peers, this.publicAddr],
        },
        bigIntReplacer,
      ),
    );
  }

  async message(ws, msg) {
    try {
      const { type, data } = JSON.parse(msg);
      console.log(`P2P [INCOM]: ${type} from ${ws.remoteUrl || "unknown"}`);

      if (type === "HANDSHAKE") {
        const { nodeId, publicAddr } = data;

        // 1. Identity Check: Avoid self-connection
        if (nodeId === this.nodeId) {
          ws.close();
          return;
        }

        // 2. Already connected to this identity?
        const duplicate = this.sockets.find(
          (s) => s.nodeId === nodeId && s !== ws,
        );
        if (duplicate) {
          ws.close();
          return;
        }

        ws.nodeId = nodeId;
        ws.remoteUrl = publicAddr;
        console.log(
          `P2P: Authorized connection from ${publicAddr} (ID: ${nodeId})`,
        );
      } else if (type === "CHAIN") {
        await this.syncChain(data, ws);
      } else if (type === "TRANSACTION") {
        const tx = new Transaction(data);
        const txHash = tx.hash();
        if (this.blockchain.addTransaction(tx)) {
          console.log(`P2P: Valid Tx received (${txHash}), broadcasting...`);
          this.broadcast({ type: "TRANSACTION", data }, ws);
        } else {
          console.error(`P2P: Incoming Tx rejected (${txHash})`);
        }
      } else if (type === "BLOCK") {
        if (await this.blockchain.addBlock(new Block(data))) {
          console.log(
            `P2P: Valid Block received (#${data.index}), broadcasting...`,
          );
          this.broadcast({ type: "BLOCK", data }, ws);
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
        this.broadcast({ type: "CHAIN", data: this.blockchain.chain }, ws);
      }
    } else {
      console.log(
        `P2P: Sync skipped. Local: ${localLen}, Incoming: ${incomingLen}, Valid: ${this.blockchain.isValidChain(incomingChain)}`,
      );
    }
  }

  broadcast(msg, originWs = null) {
    const targetSockets = this.sockets.filter((s) => {
      // 1. Don't send back to the sender (origin)
      if (s === originWs) return false;
      // 2. Don't send to ourselves
      if (s.remoteUrl === this.publicAddr) return false;
      // 3. Must be open
      return s.readyState === WebSocket.OPEN;
    });

    if (targetSockets.length > 0) {
      console.log(`P2P [BROAD]: ${msg.type} to ${targetSockets.length} peers`);
      const serializedMsg = JSON.stringify(msg, bigIntReplacer);
      targetSockets.forEach((s) => s.send(serializedMsg));
    }
  }
}
