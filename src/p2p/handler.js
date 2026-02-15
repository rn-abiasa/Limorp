import Transaction from "../core/transaction.js";
import Block from "../core/block.js";

export default class MessageHandler {
  constructor(network, blockchain) {
    this.network = network;
    this.blockchain = blockchain;
  }

  async handle(ws, msg) {
    const { type, data } = JSON.parse(msg);
    const sync = this.network.sync;

    switch (type) {
      case "STATUS":
        this.network.handleStatus(ws, data);
        break;
      case "REQUEST_CHAIN":
        ws.send(JSON.stringify({ type: "CHAIN", data: this.blockchain.chain }));
        break;
      case "CHAIN":
        await sync.handleFullChainResponse(data, ws);
        break;
      case "REQUEST_BLOCK":
        const block = this.blockchain.chain[data];
        if (block)
          ws.send(JSON.stringify({ type: "BLOCK_RESPONSE", data: block }));
        break;
      case "BLOCK_RESPONSE":
        await sync.handleBlockResponse(data, ws);
        break;
      case "TRANSACTION":
        if (
          !this.network.isSyncing &&
          this.blockchain.addTransaction(data) === "SUCCESS"
        )
          this.network.broadcast({ type: "TRANSACTION", data }, ws);
        break;
      case "BLOCK":
        if (
          !this.network.isSyncing &&
          (await this.blockchain.addBlock(new Block(data)))
        )
          this.network.broadcast({ type: "BLOCK", data }, ws);
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
}
