import { Level } from "level";

const walletDbPath = process.env.WALLET_DB_PATH || "./wallets";

async function withDb(fn) {
  const db = new Level(walletDbPath, { valueEncoding: "json" });
  try {
    return await fn(db);
  } finally {
    await db.close();
  }
}

export default {
  async saveWallet(name, mnemonic) {
    return withDb(async (db) => {
      let wallets = {};
      try {
        wallets = await db.get("wallets");
      } catch (e) {}
      wallets[name] = mnemonic;
      await db.put("wallets", wallets);
    });
  },

  async getWallets() {
    return withDb(async (db) => {
      try {
        return (await db.get("wallets")) || {};
      } catch {
        return {};
      }
    });
  },

  async setActiveWallet(name) {
    return withDb(async (db) => {
      await db.put("active", name);
    });
  },

  async getActiveWalletName() {
    return withDb(async (db) => {
      try {
        return await db.get("active");
      } catch {
        return null;
      }
    });
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
    // No-op for compatibility, DB is closed per-op now
  },
};
