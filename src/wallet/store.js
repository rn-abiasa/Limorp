import { Level } from "level";

const walletDbPath = process.env.WALLET_DB_PATH || "./db/wallets";
const db = new Level(walletDbPath, { valueEncoding: "json" });

export default {
  async saveWallet(name, mnemonic) {
    let wallets = await this.getWallets();
    wallets[name] = mnemonic;
    await db.put("wallets", wallets);
  },

  async getWallets() {
    try {
      return (await db.get("wallets")) || {};
    } catch {
      return {};
    }
  },

  async setActiveWallet(name) {
    await db.put("active", name);
  },

  async getActiveWalletName() {
    try {
      return await db.get("active");
    } catch {
      return null;
    }
  },

  async getActiveWallet(Wallet) {
    const name = await this.getActiveWalletName();
    if (!name) return null;
    const wallets = await this.getWallets();
    const mnemonic = wallets[name];
    if (!mnemonic) return null;
    return { name, wallet: Wallet.import(mnemonic) };
  },

  async close() {
    await db.close();
  },
};
