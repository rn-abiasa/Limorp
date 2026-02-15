import crypto from "crypto";

export default class Block {
  constructor({ index, lastHash, timestamp, transactions, validator }) {
    this.index = index;
    this.lastHash = lastHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.validator = validator;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const transactionsData = this.transactions.map((tx) => ({
      ...tx,
      amount: tx.amount?.toString() || "0",
      fee: tx.fee?.toString() || "0",
    }));
    return crypto
      .createHash("sha256")
      .update(
        this.index +
          this.timestamp +
          JSON.stringify(transactionsData) +
          this.validator +
          this.lastHash,
      )
      .digest("hex");
  }
}
