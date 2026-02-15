import Block from "../core/block.js";

export default class SyncManager {
  constructor(network, blockchain) {
    this.network = network;
    this.blockchain = blockchain;
    this.syncTarget = 0;
    this.syncPeer = null;
  }

  /**
   * Cek apakah perlu sinkronisasi dengan peer tersebut
   */
  checkSync(ws) {
    const localHeight = this.blockchain.chain.length;
    const peerHeight = ws.height;

    if (peerHeight > localHeight) {
      console.log(
        `P2P: Peer ${ws.remoteUrl} has longer chain (${peerHeight} > ${localHeight}).`,
      );
      this.startSync(ws, peerHeight);
    }
  }

  startSync(ws, targetHeight) {
    if (this.network.isSyncing) return;

    this.network.isSyncing = true;
    this.syncTarget = targetHeight;
    this.syncPeer = ws;

    console.log(
      `P2P: Starting incremental sync... Target height: ${targetHeight}`,
    );
    this.requestNextBlock();
  }

  requestNextBlock() {
    const nextIndex = this.blockchain.chain.length;
    if (nextIndex < this.syncTarget) {
      console.log(`P2P: Syncing block ${nextIndex}/${this.syncTarget}...`);
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
    const success = await this.blockchain.addBlock(block);

    if (success) {
      this.requestNextBlock();
    } else {
      console.error(
        `P2P: Failed to sync block #${blockData.index}. Aborting sync.`,
      );
      this.finishSync();
    }
  }

  finishSync() {
    console.log(
      `P2P: Sync finished. Current height: ${this.blockchain.chain.length}`,
    );
    this.network.isSyncing = false;
    this.syncTarget = 0;
    this.syncPeer = null;

    // Check if any other peer has even longer chain now (in case blocks added during sync)
    let bestPeer = null;
    let maxHeight = this.blockchain.chain.length;

    for (const socket of this.network.connections.sockets) {
      if (socket.height > maxHeight) {
        maxHeight = socket.height;
        bestPeer = socket;
      }
    }

    if (bestPeer) {
      console.log(
        `P2P: Detected further updates during sync (${maxHeight}). Continuing...`,
      );
      this.startSync(bestPeer, maxHeight);
    } else {
      console.log("P2P: Chain is fully up-to-date. Requesting mempool...");
      // Ask all peers for their mempool
      this.network.broadcast({ type: "REQUEST_MEMPOOL", data: null });
    }
  }

  /**
   * Fallback for full chain sync if received
   */
  async syncChain(incomingChain, ws) {
    const localLen = this.blockchain.chain.length;
    const incomingLen = incomingChain.length;

    if (incomingLen > localLen && this.blockchain.isValidChain(incomingChain)) {
      console.log(
        `P2P: Replacing local chain with longer chain (${incomingLen}).`,
      );
      await this.blockchain.rebuildFrom(incomingChain);
      this.finishSync();
    }
  }
}
