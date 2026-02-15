/**
 * Limorp Ecosystem Bot
 * Menyimulasikan aktivitas jaringan dengan transaksi otomatis antar bot.
 */

import Wallet from "./src/wallet/wallet.js";
import Transaction from "./src/core/transaction.js";

// --- KONFIGURASI ---
const BOT_COUNT = 20; // Jumlah bot
const AGGRESSIVENESS = 20; // 1 (santai) - 10 (agresif)
const API_URL = "http://localhost:4000";
const MIN_TRANSFER_AMOUNT = 1n; // Jumlah transfer minimal (LMR)
const MAX_TRANSFER_AMOUNT = 100n; // Jumlah transfer maksimal (LMR)
// -------------------

async function apiGet(path) {
  try {
    const res = await fetch(`${API_URL}${path}`);
    return res.json();
  } catch (err) {
    return null;
  }
}

async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (err) {
    return null;
  }
}

// Global BigInt serialization fix
BigInt.prototype.toJSON = function () {
  return this.toString();
};

async function startBot() {
  console.log("🚀 Memulai Limorp Ecosystem Bot...");
  console.log(`🤖 Jumlah Bot: ${BOT_COUNT}`);
  console.log(`🔥 Keagresifan: ${AGGRESSIVENESS}/10`);

  // Generate bots
  const bots = [];
  for (let i = 0; i < BOT_COUNT; i++) {
    const { wallet } = Wallet.create();
    bots.push(wallet);
  }

  console.log("\n--- DAFTAR ALAMAT BOT ---");
  bots.forEach((b, i) => console.log(`Bot #${i + 1}: ${b.publicKey}`));
  console.log("-------------------------\n");
  console.log(
    "💡 Silakan transfer dana ke salah satu alamat di atas untuk memulai siklus.\n",
  );

  const interval = Math.max(2000, 15000 - AGGRESSIVENESS * 1300);

  setInterval(async () => {
    // Pilih bot pengirim secara acak
    const senderIdx = Math.floor(Math.random() * bots.length);
    const sender = bots[senderIdx];

    // Ambil data dari API
    const balanceData = await apiGet(`/blockchain/balance/${sender.publicKey}`);
    const nonceData = await apiGet(`/blockchain/nonce/${sender.publicKey}`);

    if (!balanceData || !nonceData) {
      console.log(
        "⚠️ Gagal terhubung ke node. Pastikan node berjalan di port 4000.",
      );
      return;
    }

    const balance = BigInt(balanceData.balance);
    const minFeeData = (await apiGet("/transaction/min-fee")) || {
      minFee: "1",
    };
    const fee = BigInt(minFeeData.minFee);

    // Jika saldo cukup untuk transfer + fee
    if (balance > fee + MIN_TRANSFER_AMOUNT) {
      // Pilih target bot secara acak (bukan diri sendiri)
      let targetIdx;
      do {
        targetIdx = Math.floor(Math.random() * bots.length);
      } while (targetIdx === senderIdx);

      const target = bots[targetIdx];

      // Tentukan jumlah transfer acak
      const maxPossible = balance - fee;
      const amount =
        MIN_TRANSFER_AMOUNT +
        BigInt(
          Math.floor(
            Math.random() *
              Number(
                BigInt(MAX_TRANSFER_AMOUNT) < maxPossible
                  ? MAX_TRANSFER_AMOUNT
                  : maxPossible,
              ),
          ),
        );

      const tx = new Transaction({
        from: sender.publicKey,
        to: target.publicKey,
        amount,
        nonce: nonceData.nonce,
        fee,
      });

      tx.sign(sender);
      tx.hash = tx.hash || tx.calculateHash();

      const result = await apiPost("/transaction/transact", tx);

      if (result && result.status === "success") {
        console.log(
          `✅ [Bot #${senderIdx + 1} -> #${targetIdx + 1}] Transfer ${amount} LMR berhasil! Hash: ${result.hash.slice(0, 10)}...`,
        );
      } else {
        console.log(
          `❌ [Bot #${senderIdx + 1}] Gagal transfer: ${result ? result.message : "Koneksi terputus"}`,
        );
      }
    } else {
      // Diagnostic: bot mana yang sedang bokek (optional log)
      // console.log(`⏳ Bot #${senderIdx + 1} menunggu kiriman chip (Saldo: ${balance} LMR)`);
    }
  }, interval);
}

startBot().catch(console.error);
