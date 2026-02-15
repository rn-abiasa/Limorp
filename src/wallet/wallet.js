import bip39 from "bip39";
import EC from "elliptic";
import crypto from "crypto";

const ec = new EC.ec("secp256k1");

export default class Wallet {
  constructor(privateKey) {
    this.keyPair = ec.keyFromPrivate(privateKey);
    this.publicKey = this.keyPair.getPublic("hex");
  }

  static create() {
    const mnemonic = bip39.generateMnemonic(128);
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const privateKey = crypto.createHash("sha256").update(seed).digest("hex");

    return { mnemonic, wallet: new Wallet(privateKey) };
  }

  static import(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const privateKey = crypto.createHash("sha256").update(seed).digest("hex");

    return new Wallet(privateKey);
  }

  sign(data) {
    return this.keyPair.sign(data).toDER("hex");
  }
}
