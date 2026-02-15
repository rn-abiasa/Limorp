import { WebSocket } from "ws";

export default class DiscoveryManager {
  constructor(network, blockchain, publicAddr) {
    this.network = network;
    this.blockchain = blockchain;
    this.publicAddr = publicAddr;
  }

  startReconnectionLoop() {
    setInterval(() => {
      this.blockchain.peers.forEach((peer) => {
        if (
          peer !== this.publicAddr &&
          !this.network.connections.sockets.find((s) => s.remoteUrl === peer)
        ) {
          this.network.connectToPeer(peer);
        }
      });
    }, 15000);
  }

  handlePeerDiscovery(peerList) {
    peerList.forEach((peer) => {
      if (peer !== this.publicAddr && !this.blockchain.peers.includes(peer)) {
        console.log(`P2P: Discovered new peer: ${peer}`);
        this.network.connectToPeer(peer);
      }
    });
  }

  addPeer(url) {
    if (url !== this.publicAddr) {
      this.blockchain.addPeer(url);
    }
  }
}
