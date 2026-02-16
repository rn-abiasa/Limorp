import Block from "../core/block.js";

export default class SyncManager {
  constructor(network, blockchain) {
    this.network = network;
    this.blockchain = blockchain;
  }

  requestChain(socket) {
    if (this.network.isSyncing) return;
    this.network.send(socket, { type: "REQUEST_CHAIN" });
  }

  async handleChainResponse(receivedChain) {
    if (this.network.isSyncing) return;

    if (receivedChain.length > this.blockchain.chain.length) {
      console.log(
        `P2P: Syncing chain... Current: ${this.blockchain.chain.length}, Received: ${receivedChain.length}`,
      );
      this.network.isSyncing = true;
      try {
        await this.blockchain.rebuildFrom(receivedChain);
        console.log(
          `P2P: Sync complete. Height: ${this.blockchain.chain.length}`,
        );
      } catch (e) {
        console.error("P2P: Sync Error:", e.message);
      } finally {
        this.network.isSyncing = false;
      }
    }
  }
}
