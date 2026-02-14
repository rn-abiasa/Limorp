import express from "express";
import Wallet from "../../wallet/wallet.js";

const router = express.Router();

router.post("/create", (req, res) => {
  const result = Wallet.create();
  res.json(result);
});

router.post("/import", (req, res) => {
  const { mnemonic } = req.body;
  const wallet = Wallet.import(mnemonic);

  res.json({ publicKey: wallet.publicKey });
});

export default router;
