export default class Economy {
  constructor() {
    this.halvingInterval = 10000;
    this.baseReward = 2000n;
  }

  getBlockReward(index) {
    const halvings = Math.floor(index / this.halvingInterval);
    return this.baseReward / BigInt(Math.pow(2, halvings)) || 0n;
  }

  calculateFeeSplit(totalFees) {
    // 50% burn, 50% for validator
    return totalFees / 2n;
  }
}
