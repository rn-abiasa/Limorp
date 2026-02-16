import Transaction from "../core/transaction.js";
import Block from "../core/block.js";

export default class MessageHandler {
  constructor(network, blockchain) {
    this.network = network;
    this.blockchain = blockchain;
  }

  async handle(socket, data) {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      console.error("P2P: Failed to parse message", e.message);
      return;
    }

    const { type, data: payload } = msg;

    switch (type) {
      case "TRANSACTION":
        if (
          !this.network.isSyncing &&
          this.blockchain.addTransaction(payload) === "SUCCESS"
        ) {
          // Re-broadcast to other peers
          this.network.broadcast(msg);
        }
        break;
      case "BLOCK":
        if (!this.network.isSyncing) {
          const block = new Block(payload);
          const result = await this.blockchain.addBlock(block);
          if (result === "SUCCESS") {
            this.network.broadcast(msg);
          }
        }
        break;
      case "ANNOUNCE":
        this.blockchain.registerValidator(payload.address);
        break;
      case "REQUEST_CHAIN":
        this.network.send(socket, {
          type: "CHAIN_RESPONSE",
          data: this.blockchain.chain,
        });
        break;
      case "CHAIN_RESPONSE":
        await this.network.sync.handleChainResponse(payload);
        break;
    }
  }
}
