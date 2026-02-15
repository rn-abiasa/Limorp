import Transaction from "../core/transaction.js";
import Block from "../core/block.js";

export default class MessageHandler {
  constructor(network, blockchain) {
    this.network = network;
    this.blockchain = blockchain;
  }

  async handle(ws, msg) {
    const { type, data } = JSON.parse(msg);
    // console.log(`P2P [INCOM]: ${type} from ${ws.remoteUrl || "unknown"}`);

    switch (type) {
      case "HANDSHAKE":
        this.network.finalizeHandshake(ws, data);
        break;
      case "CHAIN":
        await this.network.sync.syncChain(data, ws, (m, o) =>
          this.network.broadcast(m, o),
        );
        break;
      case "TRANSACTION":
        this.handleTransaction(data, ws);
        break;
      case "BLOCK":
        await this.handleBlock(data, ws);
        break;
      case "ANNOUNCE":
        this.blockchain.registerValidator(data.address);
        this.network.broadcast({ type: "ANNOUNCE", data }, ws);
        break;
      case "PEERS":
        this.network.discovery.handlePeerDiscovery(data);
        break;
    }
  }

  handleTransaction(data, ws) {
    const tx = new Transaction(data);
    const result = this.blockchain.addTransaction(tx);
    if (result === "SUCCESS") {
      this.network.broadcast({ type: "TRANSACTION", data }, ws);
    }
  }

  async handleBlock(data, ws) {
    const block = new Block(data);
    if (await this.blockchain.addBlock(block)) {
      console.log(
        `P2P: Valid Block received (#${data.index}), broadcasting...`,
      );
      this.network.broadcast({ type: "BLOCK", data }, ws);
    }
  }
}
