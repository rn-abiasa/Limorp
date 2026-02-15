import crypto from "crypto";
import EC from "elliptic";

const ec = new EC.ec("secp256k1");

export default class Transaction {
  constructor({
    from,
    to,
    amount,
    nonce = 0,
    type = "TRANSFER",
    code = null,
    input = null,
    timestamp = null,
    signature = null,
    hash = null,
    gas = 10n,
    gasPrice = 1n,
  }) {
    this.from = from;
    this.to = to;
    this.amount = BigInt(amount);
    this.nonce = nonce;
    this.type = type;
    this.code = code;
    this.input = input;
    this.timestamp = timestamp || Date.now();
    this.signature = signature;
    this.hash = hash;
    this.gas = BigInt(gas);
    this.gasPrice = BigInt(gasPrice);
  }

  calculateHash() {
    const txData = {
      from: this.from,
      to: this.to,
      amount: this.amount.toString(),
      nonce: this.nonce,
      type: this.type,
      code: this.code,
      input: this.input,
      timestamp: this.timestamp,
      gas: this.gas.toString(),
      gasPrice: this.gasPrice.toString(),
    };
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(txData))
      .digest("hex");
  }

  sign(wallet) {
    if (wallet.publicKey !== this.from) {
      throw new Error("Failed sign.");
    }

    this.signature = wallet.sign(this.calculateHash());
  }

  static verify(tx) {
    if (tx.from === "SYSTEM") return true;
    if (!tx.signature) return false;

    const txInstance = new Transaction(tx);
    const key = ec.keyFromPublic(tx.from, "hex");
    return key.verify(txInstance.calculateHash(), tx.signature);
  }
}
