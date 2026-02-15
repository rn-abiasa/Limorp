import Transaction from "../core/transaction.js";
import Block from "../core/block.js";

export default class MessageHandler {
  constructor(network, blockchain) {
    this.network = network;
    this.blockchain = blockchain;
  }

  async handle(ws, msg) {
    const { type, data } = JSON.parse(msg);

    switch (type) {
      case "STATUS":
        this.network.handleStatus(ws, data);
        break;

      case "REQUEST_CHAIN":
        ws.send(JSON.stringify({ type: "CHAIN", data: this.blockchain.chain }));
        break;

      case "CHAIN":
        await this.network.sync.handleFullChainResponse(data, ws);
        break;

      case "REQUEST_BLOCK":
        this.handleRequestBlock(data, ws);
        break;

      case "BLOCK_RESPONSE":
        await this.network.sync.handleBlockResponse(data, ws);
        break;

      case "GET_MEMPOOL":
        ws.send(
          JSON.stringify({
            type: "MEMPOOL",
            data: this.blockchain.mempoolManager.transactions,
          }),
        );
        break;

      case "MEMPOOL":
        this.handleMempoolSync(data);
        break;

      case "TRANSACTION":
        if (this.network.isSyncing) break;
        this.handleTransaction(data, ws);
        break;

      case "BLOCK":
        if (this.network.isSyncing) break;
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

  handleRequestBlock(index, ws) {
    const block = this.blockchain.chain[index];
    if (block) {
      ws.send(JSON.stringify({ type: "BLOCK_RESPONSE", data: block }));
    }
  }

  handleMempoolSync(transactions) {
    if (!transactions || !Array.isArray(transactions)) return;

    // Sort by nonce to ensure strict sequential processing
    const sortedTxs = [...transactions].sort((a, b) => a.nonce - b.nonce);

    sortedTxs.forEach((txData) => {
      this.blockchain.addTransaction(txData);
    });
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
