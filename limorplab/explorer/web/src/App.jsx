import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { io } from "socket.io-client";
import Navbar from "./components/Navbar";

// Pages
import Home from "./pages/Home";
import Blocks from "./pages/Blocks";
import Transactions from "./pages/Transactions";
import Mempool from "./pages/Mempool";
import Contracts from "./pages/Contracts";
import BlockDetail from "./pages/BlockDetail";
import TransactionDetail from "./pages/TransactionDetail";
import ContractDetail from "./pages/ContractDetail";
import AddressDetail from "./pages/AddressDetail";

const socket = io("http://localhost:5000");

function App() {
  const [stats, setStats] = useState({
    height: 0,
    mempoolSize: 0,
    activeValidators: 0,
    totalTransactions: 0,
    circulatingSupply: 0,
  });
  const [blocks, setBlocks] = useState([]);
  const [mempool, setMempool] = useState([]);

  useEffect(() => {
    socket.on("STATS", setStats);
    socket.on("UPDATE_BLOCKS", setBlocks);
    socket.on("UPDATE_MEMPOOL", setMempool);

    return () => {
      socket.off("STATS");
      socket.off("UPDATE_BLOCKS");
      socket.off("UPDATE_MEMPOOL");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16 selection:bg-zinc-800 selection:text-zinc-100">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Routes>
          <Route path="/" element={<Home stats={stats} blocks={blocks} />} />
          <Route path="/blocks" element={<Blocks blocks={blocks} />} />
          <Route
            path="/transactions"
            element={<Transactions blocks={blocks} />}
          />
          <Route path="/mempool" element={<Mempool mempool={mempool} />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route
            path="/block/:index"
            element={<BlockDetail blocks={blocks} />}
          />
          <Route
            path="/transaction/:hash"
            element={<TransactionDetail blocks={blocks} />}
          />
          <Route
            path="/contract/:address"
            element={<ContractDetail blocks={blocks} />}
          />
          <Route
            path="/address/:address"
            element={<AddressDetail blocks={blocks} />}
          />
        </Routes>
      </main>

      <footer className="border-t border-border py-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-[10px]">
              L
            </div>
            Limorp Blockchain Scanner
          </div>
          <div className="flex gap-8">
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Nodes
            </span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Validators
            </span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Protocol
            </span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              GitHub
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
