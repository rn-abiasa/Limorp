import { WebSocketServer, WebSocket } from "ws";
import MessageHandler from "./handler.js";
import SyncManager from "./sync.js";

export default class Network {
  constructor(blockchain, port, peers = []) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
    this.handler = new MessageHandler(this, blockchain);
    this.sync = new SyncManager(this, blockchain);
    this.isSyncing = false;
    this.peers = peers; // Initial seed peers
  }

  async init() {
    const server = new WebSocketServer({ port: this.port });

    server.on("connection", (socket) => {
      this.initConnection(socket);
    });

    // Connect to seed peers
    this.peers.forEach((peer) => this.connectToPeer(peer));
  }

  connectToPeer(peer) {
    try {
      const socket = new WebSocket(peer);
      socket.on("open", () => this.initConnection(socket));
      socket.on("error", () => {
        console.log(`P2P: Connection failed to ${peer}`);
      });
    } catch (e) {
      console.log(`P2P: Error connecting to ${peer}: ${e.message}`);
    }
  }

  initConnection(socket) {
    this.sockets.push(socket);
    console.log(`P2P: Socket connected. Total: ${this.sockets.length}`);

    socket.on("message", (data) => {
      this.handler.handle(socket, data);
    });

    socket.on("close", () => {
      this.sockets.splice(this.sockets.indexOf(socket), 1);
      console.log(`P2P: Socket closed. Total: ${this.sockets.length}`);
    });

    socket.on("error", () => {
      this.sockets.splice(this.sockets.indexOf(socket), 1);
    });

    // Ask for chain when connected
    this.sync.requestChain(socket);
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    this.sockets.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });
  }

  send(socket, msg) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }
}
