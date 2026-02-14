import express from "express";
import cors from "cors";

import walletRoutes from "./routes/wallet.routes.js";
import Wallet from "../wallet/wallet.js";
import Transaction from "../core/transaction.js";

import { getLocalIp } from "../utils/network.js";

export default function startAPI({ chain, p2p }, port = 4000) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Helper middleware
  app.use((req, res, next) => {
    req.chain = chain;
    req.p2p = p2p;
    next();
  });

  // Wallet routes
  app.use("/wallet", walletRoutes);

  // Blockchain queries
  app.get("/blocks", (req, res) => {
    res.json(req.chain.chain);
  });

  app.get("/mempool", (req, res) => {
    res.json(req.chain.mempool);
  });

  app.get("/balance/:address", (req, res) => {
    const balance = req.chain.getBalance(req.params.address);
    res.json({ address: req.params.address, balance: balance.toString() });
  });

  app.get("/nonce/:address", (req, res) => {
    const nonce = req.chain.getNonce(req.params.address);
    res.json({ address: req.params.address, nonce });
  });

  app.get("/validators", (req, res) => {
    const addresses = req.chain.getValidValidators();
    const now = Date.now();
    res.json(
      addresses.map((addr) => ({
        address: addr,
        lastSeen: req.chain.validators[addr],
        active: true,
      })),
    );
  });

  app.get("/peers", (req, res) => {
    res.json(req.chain.peers);
  });

  app.get("/contracts", (req, res) => {
    res.json(req.chain.contractState);
  });

  app.get("/network-stats", (req, res) => {
    const totalTransactions = req.chain.chain.reduce(
      (sum, block) => sum + block.transactions.length,
      0,
    );
    const activeValidators = req.chain.getValidValidators().length;

    res.json({
      height: req.chain.chain.length,
      totalTransactions,
      activeValidators,
      mempoolSize: req.chain.mempool.length,
      halvingInterval: 100, // Hardcoded or from chain
      nodes: req.chain.peers.length + 1, // Peers + self
    });
  });

  app.get("/next-validator", (req, res) => {
    const lastHash = req.chain.lastBlock().hash;
    const winner = req.chain.selectValidator(lastHash);
    res.json({ winner });
  });

  // Transaction submission
  app.post("/transact", (req, res) => {
    const tx = req.body;
    const result = req.chain.addTransaction(tx);

    if (result === "SUCCESS") {
      req.p2p.broadcast({ type: "TRANSACTION", data: tx });
      const txInstance = new Transaction(tx);
      res.json({ status: "success", hash: txInstance.calculateHash() });
    } else if (result === "SKIPPED") {
      const txInstance = new Transaction(tx);
      res.json({
        status: "skipped",
        message: "Transaction already processed",
        hash: txInstance.calculateHash(),
      });
    } else {
      res.status(400).json({ status: "fail", message: "Invalid transaction" });
    }
  });

  app.get("/gas-price", (req, res) => {
    // Basic dynamic gas price: 1 + (mempool size / 5)
    const suggestedPrice =
      1n + BigInt(Math.floor(req.chain.mempool.length / 5));
    res.json({ suggestedGasPrice: suggestedPrice.toString() });
  });

  // Trigger mining (simplified for CLI/Testing)
  app.post("/mine", async (req, res) => {
    const { validatorMnemonic } = req.body;
    if (!validatorMnemonic) {
      return res
        .status(400)
        .json({ status: "fail", message: "Validator mnemonic required" });
    }

    try {
      const wallet = Wallet.import(validatorMnemonic);
      const scheduledWinner = req.chain.selectValidator(
        req.chain.lastBlock().hash,
      );

      if (wallet.publicKey !== scheduledWinner) {
        return res.status(403).json({
          status: "fail",
          message: "Not your turn",
          winner: scheduledWinner,
        });
      }

      const block = await req.chain.createBlock(wallet);
      if (block) {
        req.p2p.broadcast({ type: "BLOCK", data: block });
        res.json({ status: "success", block });
      } else {
        res
          .status(500)
          .json({ status: "fail", message: "Block production failed" });
      }
    } catch (err) {
      res.status(500).json({ status: "fail", message: err.message });
    }
  });

  app.listen(port, () => {
    console.log(`API running on port: ${port}`);
  });
}
