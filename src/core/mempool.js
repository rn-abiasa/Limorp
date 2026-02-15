export default class Mempool {
  constructor() {
    this.transactions = [];
  }

  add(tx) {
    // Deduplication
    if (this.transactions.some((t) => t.hash === tx.hash)) {
      return "SKIPPED";
    }

    this.transactions.push(tx);
    // Sort by fee (higher fee = higher priority)
    this.transactions.sort((a, b) => Number(BigInt(b.fee) - BigInt(a.fee)));
    return "SUCCESS";
  }

  remove(hashes) {
    this.transactions = this.transactions.filter(
      (t) => !hashes.includes(t.hash),
    );
  }

  get size() {
    return this.transactions.length;
  }

  getSorted() {
    return [...this.transactions];
  }

  filterBySender(address) {
    return this.transactions.filter((tx) => tx.from === address);
  }

  clear() {
    this.transactions = [];
  }
}
