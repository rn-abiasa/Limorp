import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const API_URL = "http://localhost:4000";

let lastScan = {
  blocks: [],
  mempool: [],
  stats: {},
};

async function fetchStats() {
  try {
    const [blocks, mempool, stakes] = await Promise.all([
      axios.get(`${API_URL}/blocks`),
      axios.get(`${API_URL}/mempool`),
      axios.get(`${API_URL}/stakes`),
    ]);

    const newStats = {
      height: blocks.data.length,
      mempoolSize: mempool.data.length,
      totalStaked: Object.values(stakes.data)
        .reduce((a, b) => BigInt(a) + BigInt(b), 0n)
        .toString(),
      totalTransactions: blocks.data.reduce(
        (sum, b) => sum + b.transactions.length,
        0,
      ),
    };

    // Broadcast if blocks changed
    if (JSON.stringify(blocks.data) !== JSON.stringify(lastScan.blocks)) {
      if (lastScan.blocks.length > 0) {
        io.emit("NEW_BLOCK", blocks.data[blocks.data.length - 1]);
      }
      io.emit("UPDATE_BLOCKS", blocks.data);
      lastScan.blocks = blocks.data;
    }

    // Broadcast if mempool changed
    if (JSON.stringify(mempool.data) !== JSON.stringify(lastScan.mempool)) {
      io.emit("UPDATE_MEMPOOL", mempool.data);
      lastScan.mempool = mempool.data;
    }

    // Always broadcast/update stats if they changed
    if (JSON.stringify(newStats) !== JSON.stringify(lastScan.stats)) {
      io.emit("STATS", newStats);
      lastScan.stats = newStats;
    }
  } catch (err) {
    console.error("Error fetching stats from API:", err.message);
  }
}

// Initial fetch on server start
fetchStats();

// Poll periodically
setInterval(fetchStats, 2000);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send current state IMMEDIATELY to this specific client only
  if (lastScan.blocks.length > 0) {
    socket.emit("UPDATE_BLOCKS", lastScan.blocks);
    socket.emit("STATS", lastScan.stats);
  }
  if (lastScan.mempool.length > 0) {
    socket.emit("UPDATE_MEMPOOL", lastScan.mempool);
  }

  // Also trigger a fresh fetch to ensure data is absolute latest
  fetchStats();
});

const PORT = 5000;
httpServer.listen(PORT, () => {
  console.log(`Explorer Socket Server running on port ${PORT}`);
});
