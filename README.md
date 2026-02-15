# Limorp: Production-Ready Simple Blockchain

Limorp adalah blockchain sederhana namun tangguh yang dibangun menggunakan Node.js. Proyek ini mencakup fitur-fitur utama blockchain modern seperti konsensus Proof of Stake (PoS), Smart Contracts, sinkronisasi P2P, dan penyimpanan data permanen.

## ✨ Fitur Utama

- **Metode Konsensus Proof of Stake (PoS)**: Validator dipilih berdasarkan jumlah koin yang di-stake. Semakin besar stake, semakin besar peluang menjadi validator.
- **Validator Rewards**: Setiap validator yang berhasil memvalidasi block akan mendapatkan reward (50 LMR) untuk mengamankan jaringan.
- **Smart Contracts (VM-based)**: Mendukung deployment dan eksekusi kode JavaScript sederhana di dalam environment yang aman (sandbox).
- **Sinkronisasi P2P**: Node dapat saling bertukar data block dan transaksi secara real-time menggunakan WebSockets.
- **Persistensi Data (LevelDB)**: Seluruh data block, saldo, stake, dan state contract tersimpan secara permanen di disk.
- **Pencegahan Double-Spending**: Menggunakan sistem nonce yang ketat untuk memastikan setiap transaksi unik dan valid.
- **CLI Interaktif**: Dilengkapi dengan alat baris perintah (CLI) yang cantik menggunakan Clack Prompt.
- **REST API Lengkap**: Endpoint API untuk interaksi eksternal (cek saldo, kirim transaksi, audit block, dll).

## 🚀 Cara Memulai

### 1. Instalasi

Pastikan Anda memiliki Node.js versi terbaru (v20+ direkomendasikan).

```bash
npm install
```

### 2. Jalankan Node

Jalankan node blockchain utama beserta API dan P2P server.

```bash
npm run dev
```

Secara default:

- **P2P Server**: Port 3000
- **API Server**: Port 4000

### 3. Jalankan CLI Wallet

Gunakan CLI untuk mengelola wallet, mengirim koin, atau melakukan staking.

```bash
npm run cli
```

## 📂 Struktur Proyek

```text
src/
├── api/             # REST API server & routes
├── core/            # Logika inti blockchain (Block, Chain, Transaction, PoS, VM)
├── db/              # Integrasi LevelDB untuk persistensi data
├── p2p/             # Server komunikasi antar node (WebSockets)
├── wallet/          # Manajemen kunci, wallet, dan penyimpanan wallet lokal
└── index.js         # Entry point aplikasi utama
```

## 🛠 Panduan Penggunaan

### Transaksi & Staking via CLI

1. Jalankan `npm run cli`.
2. Pilih **Create New Wallet** untuk memulai.
3. Gunakan **View Wallet Details** untuk melihat saldo awal (Anda bisa memberikan saldo awal secara manual di file `verify.js` untuk testing).
4. Gunakan **Stake Funds** untuk mengunci dana Anda dan mulai bertindak sebagai validator.
5. Gunakan **Transfer** untuk mengirim dana ke alamat lain.

### REST API Endpoints

- `GET /blocks`: Daftar seluruh block.
- `GET /balance/:address`: Cek saldo alamat tertentu.
- `GET /mempool`: Daftar transaksi yang menunggu diproses.
- `POST /transact`: Mengirim transaksi mentah melalui API.

## 🧪 Verifikasi & Pengujian

Terdapat script khusus untuk memvalidasi fitur-fitur blockchain:

- `node verify.js`: Menguji alur transfer, staking, dan smart contract dalam satu sesi.
- `node verify_persistence.js`: Menguji apakah data tetap aman saat aplikasi dimatikan dan dijalankan kembali.

## 🌐 Menjalankan Multi-Node (Local Network)

Anda dapat menjalankan beberapa node sekaligus untuk mensimulasikan jaringan nyata, baik di satu komputer (menggunakan localhost) maupun di beberapa komputer dalam jaringan WiFi/LAN yang sama.

### 🔌 Menghubungkan Antar Perangkat (LAN)

Jika Anda ingin menghubungkan node di dua komputer berbeda:

1.  **Cek IP Lokal**: Di terminal komputer utama (Bootnode), ketik `ifconfig` (Mac/Linux) atau `ipconfig` (Windows) untuk menemukan IP lokal Anda (misal: `192.168.1.5`).
2.  **Jalankan Bootnode** (Komputer A):
    ```bash
    P2P_PORT=3000 API_PORT=4000 npm run dev
    ```
3.  **Jalankan Peer** (Komputer B): Gunakan IP Komputer A untuk menyambung.
    ```bash
    P2P_PORT=3000 API_PORT=4000 PEERS=ws://192.168.1.5:3000 npm run dev
    ```

### 🔍 Explorer & Scanner (Real-time)

Aplikasi web untuk memantau aktivitas blockchain secara visual dan real-time.

#### 1. Jalankan Socket Server

```bash
cd explorer/server
node index.js
```

#### 2. Jalankan Web Explorer

```bash
cd explorer/web
npm run dev
```

Buka browser di `http://localhost:5173`.

---

### 🛡️ Anti-Inflasi

- **Burn Fee**: 50% dari gas fee setiap transaksi akan dihapuskan (burn).
- **Halving**: Hadiah block berkurang 50% setiap kelipatan 100 block.

### 📜 Smart Contracts

Lihat panduan lengkap di [DOCS/SMART_CONTRACTS.md](file:///Users/abiasa/Projects/Limorp/DOCS/SMART_CONTRACTS.md).

### 💻 Menjalankan di Satu Komputer (Localhost)

Setiap node baru harus menggunakan port yang berbeda.

**Node 1 (Bootnode)**:

```bash
P2P_PORT=3000 API_PORT=4000 npm run dev
```

**Node 2 (Peer)**:

```bash
P2P_PORT=3001 API_PORT=4001 PEERS=ws://localhost:3000 npm run dev
```

> [!TIP]
> Pastikan firewall Anda mengizinkan koneksi pada port P2P (default 3000) agar node lain dapat terhubung.

---

**Limorp Blockchain** - Dibuat untuk tujuan edukasi dan pengembangan blockchain production sederhana.
