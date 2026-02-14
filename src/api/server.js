import express from "express";
import cors from "cors";

import walletRoutes from "./routes/wallet.routes.js";
import Wallet from "../wallet/wallet.js";
import Transaction from "../core/transaction.js";

import { getLocalIp, bigIntReplacer } from "../utils/network.js";

export default function startAPI({ chain, p2p }, port = 4000) {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.set("json replacer", bigIntReplacer);

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

  app.get("/stakes", (req, res) => {
    res.json(req.chain.stakes);
  });

  app.get("/contracts", (req, res) => {
    res.json(req.chain.contractState);
  });

  // Transaction submission
  app.post("/transact", (req, res) => {
    const tx = req.body;
    if (req.chain.addTransaction(tx)) {
      req.p2p.broadcast({ type: "TRANSACTION", data: tx });
      const txInstance = new Transaction(tx);
      res.json({ status: "success", hash: txInstance.hash() });
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
      const block = await req.chain.createBlock(wallet);
      if (block) {
        req.p2p.broadcast({ type: "BLOCK", data: block });
        res.json({ status: "success", block });
      } else {
        res.status(500).json({ status: "fail", message: "Mining failed" });
      }
    } catch (err) {
      res.status(500).json({ status: "fail", message: err.message });
    }
  });

  app.listen(port, () => {
    console.log(`API running on port: ${port}`);
  });
}
