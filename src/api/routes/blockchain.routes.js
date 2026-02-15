import express from "express";

const router = express.Router();

router.get("/blocks", (req, res) => {
  res.json(req.chain.chain);
});

router.get("/mempool", (req, res) => {
  res.json(req.chain.mempool);
});

router.get("/balance/:address", (req, res) => {
  const balance = req.chain.getBalance(req.params.address);
  res.json({ address: req.params.address, balance: balance.toString() });
});

router.get("/nonce/:address", (req, res) => {
  const nonce = req.chain.getNonce(req.params.address);
  res.json({ address: req.params.address, nonce });
});

export default router;
