import express from "express";

const router = express.Router();

router.get("/validators", (req, res) => {
  const addresses = req.chain.getValidValidators();
  res.json(
    addresses.map((addr) => ({
      address: addr,
      lastSeen: req.chain.validators[addr],
      active: true,
    })),
  );
});

router.get("/peers", (req, res) => {
  res.json(req.chain.peers);
});

router.get("/stats", (req, res) => {
  const totalTransactions = req.chain.chain.reduce(
    (sum, block) => sum + block.transactions.length,
    0,
  );
  const activeValidators = req.chain.getValidValidators().length;
  const circulatingSupply = Object.values(req.chain.balances).reduce(
    (sum, val) => sum + val,
    0n,
  );

  res.json({
    height: req.chain.chain.length,
    totalTransactions,
    activeValidators,
    mempoolSize: req.chain.mempool.length,
    halvingInterval: 100,
    nodes: req.chain.peers.length + 1,
    circulatingSupply: circulatingSupply.toString(),
  });
});

router.get("/next-validator", (req, res) => {
  const lastHash = req.chain.lastBlock().hash;
  const winner = req.chain.selectValidator(lastHash);
  res.json({ winner });
});

export default router;
