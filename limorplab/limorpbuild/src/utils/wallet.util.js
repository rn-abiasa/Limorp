import bip39 from "bip39";
import EC from "elliptic";
import crypto from "crypto";

const ec = new EC.ec("secp256k1");

export const _import_wallet = (mnemonic) => {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const privateKey = crypto.createHash("sha256").update(seed).digest("hex");

  const keyPair = ec.keyFromPrivate(privateKey);
  const publicKey = keyPair.getPublic("hex");

  return {
    privateKey,
    publicKey,
  };
};

export const sign = (privateKey, data) => {
  const keyPair = ec.keyFromPrivate(privateKey);
  const signature = keyPair.sign(data).toDER("hex");

  return signature;
};

export const calculateTxHash = (tx) => {
  // Urutan field HARUS persis sama dengan core Limorp
  const txData = {
    from: tx.from,
    to: tx.to,
    amount: tx.amount.toString(),
    nonce: tx.nonce,
    type: tx.type,
    code: tx.code,
    input: tx.input,
    timestamp: tx.timestamp,
    fee: tx.fee.toString(),
  };
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(txData))
    .digest("hex");
};

export const hash = (data) => {
  // Fallback untuk data umum
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};
