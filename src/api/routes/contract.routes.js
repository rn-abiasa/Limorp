import express from "express";
import { detectContractType } from "../utils.js";

const router = express.Router();

router.get("/", (req, res) => {
  const contracts = {};
  for (const [addr, data] of Object.entries(req.chain.contractState)) {
    contracts[addr] = {
      ...data,
      detectedType: detectContractType(data.code),
    };
  }
  res.json(contracts);
});

router.get("/:address", (req, res) => {
  const contract = req.chain.contractState[req.params.address];
  if (!contract) {
    return res
      .status(404)
      .json({ status: "fail", message: "Contract not found" });
  }
  res.json({
    ...contract,
    detectedType: detectContractType(contract.code),
  });
});

router.get("/:address/holders", (req, res) => {
  const contract = req.chain.contractState[req.params.address];
  if (!contract) {
    return res
      .status(404)
      .json({ status: "fail", message: "Contract not found" });
  }

  const holders = [];
  const state = contract.state || {};

  for (const [key, value] of Object.entries(state)) {
    const isAddress = /^[0-9a-f]{64}$/i.test(key);
    const isNumeric = typeof value === "number" || typeof value === "bigint";

    if (isAddress && isNumeric && value > 0) {
      holders.push({
        address: key,
        balance: value.toString(),
      });
    }
  }

  holders.sort((a, b) => {
    const valA = BigInt(a.balance);
    const valB = BigInt(b.balance);
    return valA > valB ? -1 : valA < valB ? 1 : 0;
  });

  res.json({
    contract: req.params.address,
    totalHolders: holders.length,
    holders,
  });
});

export default router;
