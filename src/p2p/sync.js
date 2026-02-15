import Block from "../core/block.js";

export default class SyncManager {
  constructor(network, blockchain) {
    this.network = network;
    this.blockchain = blockchain;
    this.syncTarget = 0;
    this.syncPeer = null;
  }

  checkSync(ws) {
    const localHeight = this.blockchain.chain.length;
    const peerHeight = ws.height;

    if (peerHeight > localHeight) {
      this.startSync(ws, peerHeight);
    } else {
      // Already synced or ahead, just update mempool
      ws.send(JSON.stringify({ type: "GET_MEMPOOL" }));
    }
  }

  startSync(ws, targetHeight) {
    if (this.network.isSyncing) return;

    this.network.isSyncing = true;
    this.syncTarget = targetHeight;
    this.syncPeer = ws;

    console.log(
      `P2P: Syncing ${this.blockchain.chain.length}/${targetHeight}...`,
    );
    this.requestNextBlock();
  }

  requestNextBlock() {
    const nextIndex = this.blockchain.chain.length;
    if (nextIndex < this.syncTarget) {
      this.syncPeer.send(
        JSON.stringify({ type: "REQUEST_BLOCK", data: nextIndex }),
      );
    } else {
      this.finishSync();
    }
  }

  async handleBlockResponse(blockData, ws) {
    if (!this.network.isSyncing || this.syncPeer !== ws) return;

    const block = new Block(blockData);
    if (await this.blockchain.addBlock(block)) {
      this.requestNextBlock();
    } else {
      console.error(`P2P: Sync failed at block #${blockData.index}`);
      this.finishSync();
    }
  }

  finishSync() {
    this.network.isSyncing = false;
    this.syncTarget = 0;
    this.syncPeer = null;

    console.log(`P2P: Sync finished at height ${this.blockchain.chain.length}`);

    // Request mempool after chain is synced
    this.network.broadcast({ type: "GET_MEMPOOL" });
  }
}
