import db from "../db/db.js";

export default class State {
  constructor() {
    this.balances = {};
    this.nonces = {};
    this.contractState = {};
    this.nodeId = null;
    this.peers = [];
  }

  async load() {
    const saved = await db.load();
    if (saved) {
      this.balances = {};
      for (const address in saved.balances) {
        this.balances[address] = BigInt(saved.balances[address]);
      }
      this.nonces = saved.nonces;
      this.contractState = saved.contractState;
      this.peers = saved.peers || [];
      this.nodeId = saved.nodeId || null;
      return true;
    }
    return false;
  }

  async save(chain) {
    await db.save({
      chain,
      balances: this.balances,
      nonces: this.nonces,
      contractState: this.contractState,
      peers: this.peers,
      nodeId: this.nodeId,
    });
  }

  getBalance(address) {
    return this.balances[address] || 0n;
  }

  getNonce(address) {
    return this.nonces[address] || 0;
  }

  updateBalance(address, amount) {
    this.balances[address] = this.getBalance(address) + amount;
  }

  setNonce(address, nonce) {
    this.nonces[address] = nonce;
  }

  getContract(address) {
    return this.contractState[address];
  }

  setContract(address, data) {
    this.contractState[address] = data;
  }

  reset(genesis) {
    this.balances = {};
    this.nonces = {};
    this.contractState = {};
  }
}
