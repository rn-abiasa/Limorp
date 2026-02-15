const VALIDATOR_TIMEOUT = 60000;

export default class Consensus {
  constructor() {
    this.validators = {}; // { address: lastSeenTimestamp }
  }

  registerValidator(address) {
    this.validators[address] = Date.now();
  }

  getValidValidators() {
    const now = Date.now();
    return Object.keys(this.validators).filter(
      (addr) => now - this.validators[addr] < VALIDATOR_TIMEOUT,
    );
  }

  selectValidator(seed, currentValidatorAddr = null) {
    let activeAddresses = this.getValidValidators();

    if (
      currentValidatorAddr &&
      !activeAddresses.includes(currentValidatorAddr)
    ) {
      activeAddresses.push(currentValidatorAddr);
    }

    if (activeAddresses.length === 0) return "GENESIS";

    activeAddresses.sort();

    const seedNum = BigInt("0x" + seed);
    const winnerIndex = Number(seedNum % BigInt(activeAddresses.length));

    return activeAddresses[winnerIndex];
  }
}
