import crypto from "crypto";
import pkg from "elliptic";
const { ec: EC } = pkg;
const ec = new EC("secp256k1");

export default class Transaction {
  constructor(data) {
    this.from = data.from;
    this.to = data.to;
    this.amount = data.amount !== undefined ? BigInt(data.amount) : 0n;
    this.nonce = data.nonce;
    this.fee = data.fee !== undefined ? BigInt(data.fee) : 0n;
    this.type = data.type || "TRANSFER";
    this.hash = data.hash;
    this.signature = data.signature;
  }

  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        `${this.from}${this.to}${this.amount}${this.nonce}${this.fee || 0}`,
      )
      .digest("hex");
  }

  sign(wallet) {
    if (wallet.publicKey !== this.from) return;
    this.hash = this.calculateHash();
    const sig = wallet.keyPair.sign(this.hash);
    this.signature = sig.toDER("hex");
  }

  static verify(tx) {
    if (!tx.from || !tx.to || tx.amount === undefined || tx.nonce === undefined)
      return false;
    if (tx.from === "SYSTEM") return true;

    if (!tx.signature || tx.signature.length === 0) return false;

    const key = ec.keyFromPublic(tx.from, "hex");
    const hash = crypto
      .createHash("sha256")
      .update(`${tx.from}${tx.to}${tx.amount}${tx.nonce}${tx.fee || 0}`)
      .digest("hex");
    return key.verify(hash, tx.signature);
  }
}
