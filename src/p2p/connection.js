import { WebSocketServer } from "ws";

export default class ConnectionManager {
  constructor(port, onConnection) {
    this.sockets = [];
    this.server = new WebSocketServer({ port });
    this.server.on("connection", (ws) => onConnection(ws));
  }

  addSocket(ws) {
    this.sockets.push(ws);
  }

  removeSocket(ws) {
    this.sockets = this.sockets.filter((s) => s !== ws);
  }

  get activeSockets() {
    return this.sockets;
  }

  broadcast(msg, originWs = null, publicAddr = "") {
    const targetSockets = this.sockets.filter((s) => {
      if (s === originWs) return false;
      if (s.remoteUrl === publicAddr) return false;
      return s.readyState === 1; // WebSocket.OPEN
    });

    if (targetSockets.length > 0) {
      const serializedMsg = JSON.stringify(msg);
      targetSockets.forEach((s) => s.send(serializedMsg));
      return targetSockets.length;
    }
    return 0;
  }
}
