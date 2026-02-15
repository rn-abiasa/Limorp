import express from "express";
import cors from "cors";

// Routes
import walletRoutes from "./routes/wallet.routes.js";
import blockchainRoutes from "./routes/blockchain.routes.js";
import contractRoutes from "./routes/contract.routes.js";
import networkRoutes from "./routes/network.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";

export default function startAPI({ chain, p2p }, port = 4000) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Global Context Middleware
  app.use((req, res, next) => {
    req.chain = chain;
    req.p2p = p2p;
    next();
  });

  // Modules
  app.use("/wallet", walletRoutes);
  app.use("/blockchain", blockchainRoutes);
  app.use("/contracts", contractRoutes);
  app.use("/network", networkRoutes);
  app.use("/transaction", transactionRoutes);

  // Legacy compat redirects (optional, but good for existing clients)
  app.get("/blocks", (req, res) => res.redirect("/blockchain/blocks"));
  app.get("/mempool", (req, res) => res.redirect("/blockchain/mempool"));
  app.get("/balance/:address", (req, res) =>
    res.redirect(`/blockchain/balance/${req.params.address}`),
  );
  app.get("/nonce/:address", (req, res) =>
    res.redirect(`/blockchain/nonce/${req.params.address}`),
  );
  app.get("/validators", (req, res) => res.redirect("/network/validators"));
  app.get("/peers", (req, res) => res.redirect("/network/peers"));
  app.get("/network-stats", (req, res) => res.redirect("/network/stats"));
  app.post("/transact", (req, res) =>
    res.redirect(307, "/transaction/transact"),
  );
  app.get("/min-fee", (req, res) => res.redirect("/transaction/min-fee"));

  app.listen(port, () => {
    console.log(`API running on port: ${port}`);
  });
}
