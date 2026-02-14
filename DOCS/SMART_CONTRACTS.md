# 📜 Panduan Smart Contract Limorp

Blockchain Limorp mendukung Smart Contract berbasis JavaScript sederhana yang dijalankan di dalam lingkungan terisolasi (Sandbox VM).

## 🏗️ Arsitektur

Smart Contract di Limorp memiliki dua komponen utama:

1.  **Code**: Logika JavaScript (string).
2.  **State**: Data persisten milik contract tersebut.

## 📝 Contoh Kode Contract (Token Sederhana)

Simpan kode berikut sebagai referensi logika contract Anda:

```javascript
// Input: { method: "transfer", to: "ADDR", amount: 10 }
if (input.method === "transfer") {
  const from = caller;
  const to = input.to;
  const amount = input.amount;

  state.balances = state.balances || {};
  state.balances[from] = (state.balances[from] || 1000) - amount; // Initial supply 1000
  state.balances[to] = (state.balances[to] || 0) + amount;
}
return state;
```

## 🚀 Cara Deploy via API

Karena fitur ini tidak ada di CLI untuk alasan keamanan/kerapihan, Anda bisa menggunakan script Node.js berikut untuk men-deploy contract:

```javascript
import Transaction from "./src/core/transaction.js";
import Wallet from "./src/wallet/wallet.js";

const wallet = Wallet.import("mnemonic Anda di sini...");
const code = `
  if (input.method === "increment") {
    state.count = (state.count || 0) + 1;
  }
  return state;
`;

const tx = new Transaction({
  from: wallet.publicKey,
  to: "CONTRACT_DEPLOY", // Penanda khusus
  amount: 0n,
  type: "CONTRACT_DEPLOY",
  code: code,
  nonce: 0, // Sesuaikan dengan nonce akun Anda
});

tx.sign(wallet);

// Kirim ke API
const res = await fetch("http://localhost:4000/transact", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(tx, (k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  ),
});
console.log(await res.json());
```

## 📞 Cara Memanggil (Call) Contract

Setelah di-deploy, contract akan memiliki alamat (hash dari transaksi deploy). Gunakan alamat tersebut sebagai `to` dalam transaksi `CONTRACT_CALL`.

```javascript
const callTx = new Transaction({
  from: wallet.publicKey,
  to: "ALAMAT_CONTRACT_HASIL_DEPLOY",
  amount: 0n,
  type: "CONTRACT_CALL",
  input: { method: "increment" },
  nonce: 1,
});
```

## 🔍 Mengecek State Contract

Anda bisa melihat state terbaru dari semua contract melalui endpoint:
`GET http://localhost:4000/contracts`
