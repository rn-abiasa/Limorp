export default class SyncManager {
  constructor(blockchain) {
    this.blockchain = blockchain;
  }

  async syncChain(incomingChain, ws, broadcast) {
    const localLen = this.blockchain.chain.length;
    const incomingLen = incomingChain.length;

    if (incomingLen > localLen && this.blockchain.isValidChain(incomingChain)) {
      console.log(
        `P2P: Incoming chain is longer (${incomingLen} > ${localLen}). Syncing...`,
      );
      const success = await this.blockchain.rebuildFrom(incomingChain);
      if (success) {
        broadcast({ type: "CHAIN", data: this.blockchain.chain }, ws);
      }
    } else {
      console.log(
        `P2P: Sync skipped. Local: ${localLen}, Incoming: ${incomingLen}`,
      );
    }
  }
}
