import express from "express";
import Transaction from "../../core/transaction.js";
import Wallet from "../../wallet/wallet.js";

const router = express.Router();

router.post("/transact", (req, res) => {
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

router.get("/min-fee", (req, res) => {
  const minFee = req.chain.getMinFee();
  res.json({ minFee: minFee.toString() });
});

router.post("/mine", async (req, res) => {
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

export default router;
