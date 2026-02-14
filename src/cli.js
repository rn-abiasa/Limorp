import * as p from "@clack/prompts";
import color from "picocolors";
import Transaction from "./core/transaction.js";
import Wallet from "./wallet/wallet.js";
import WalletStore from "./wallet/store.js";

const API_URL = "http://localhost:4000";

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body, (k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  });
  return res.json();
}

async function main() {
  p.intro(color.bgCyan(color.black(" Limorp Blockchain CLI (API-Mode) ")));

  while (true) {
    const activeData = await WalletStore.getActiveWallet(Wallet);
    const activeName = activeData ? activeData.name : "None";
    const activeAddr = activeData ? activeData.wallet.publicKey : "N/A";

    let balance = "0";
    if (activeData) {
      try {
        const data = await apiGet(`/balance/${activeAddr}`);
        balance = data.balance;
        console.log(
          color.dim(
            `Active: ${activeName} (${activeAddr.slice(0, 10)}...) | Balance: ${balance} LMR`,
          ),
        );
      } catch {
        console.log(
          color.red("⚠️ Failed to connect to Node API. Is the node running?"),
        );
      }
    }

    const action = await p.select({
      message: "Main Menu",
      options: [
        { value: "create", label: "Create New Wallet" },
        { value: "import", label: "Import Wallet" },
        { value: "manage", label: "Manage Wallets (Switch)" },
        { value: "view", label: "View Active Wallet Details" },
        { value: "transfer", label: "Transfer Funds" },
        { value: "stake", label: "Stake Funds" },
        { value: "mine", label: "Force Mine Block" },
        { value: "exit", label: "Exit" },
      ],
    });

    if (p.isCancel(action) || action === "exit") break;

    switch (action) {
      case "create": {
        const name = await p.text({
          message: "Wallet Name",
          placeholder: "my-wallet",
        });
        if (p.isCancel(name)) break;
        const { mnemonic, wallet } = Wallet.create();
        await WalletStore.saveWallet(name, mnemonic);
        await WalletStore.setActiveWallet(name);
        p.note(
          `Mnemonic: ${mnemonic}\nAddress: ${wallet.publicKey}`,
          "Wallet Created!",
        );
        break;
      }

      case "import": {
        const name = await p.text({
          message: "Wallet Name",
          placeholder: "my-wallet",
        });
        if (p.isCancel(name)) break;
        const mnemonicText = await p.text({ message: "Paste Mnemonic" });
        if (p.isCancel(mnemonicText)) break;
        await WalletStore.saveWallet(name, mnemonicText);
        await WalletStore.setActiveWallet(name);
        p.log.success("Wallet Imported & Set as Active!");
        break;
      }

      case "manage": {
        const wallets = await WalletStore.getWallets();
        const names = Object.keys(wallets);
        if (names.length === 0) {
          p.log.error("No wallets found.");
          break;
        }
        const selected = await p.select({
          message: "Select Wallet",
          options: names.map((n) => ({ value: n, label: n })),
        });
        if (p.isCancel(selected)) break;
        await WalletStore.setActiveWallet(selected);
        p.log.success(`Active wallet switched to ${selected}`);
        break;
      }

      case "view": {
        if (!activeData) {
          p.log.error("No active wallet.");
          break;
        }
        const stakes = await apiGet("/stakes");
        const myStake = stakes[activeAddr] || "0";
        p.note(
          `Name: ${activeName}\nAddress: ${activeAddr}\nBalance: ${balance} LMR\nStake: ${myStake} LMR`,
          "Wallet Details",
        );
        break;
      }

      case "transfer": {
        if (!activeData) {
          p.log.error("No active wallet.");
          break;
        }
        const to = await p.text({ message: "Recipient Address" });
        if (p.isCancel(to)) break;
        const amountStr = await p.text({ message: "Amount" });
        if (p.isCancel(amountStr)) break;

        const gasData = await apiGet("/gas-price");
        const gasPriceStr = await p.text({
          message: "Gas Price (higher = faster)",
          placeholder: gasData.suggestedGasPrice,
          initialValue: gasData.suggestedGasPrice,
        });
        if (p.isCancel(gasPriceStr)) break;

        const nonceData = await apiGet(`/nonce/${activeAddr}`);

        const tx = new Transaction({
          from: activeAddr,
          to,
          amount: BigInt(amountStr),
          nonce: nonceData.nonce,
          gasPrice: BigInt(gasPriceStr),
        });
        tx.sign(activeData.wallet);

        const result = await apiPost("/transact", tx);
        if (result.status === "success") {
          p.log.success(`Transaction submitted! Hash: ${result.hash}`);
        } else {
          p.log.error(`Submission failed: ${result.message}`);
        }
        break;
      }

      case "stake": {
        if (!activeData) {
          p.log.error("No active wallet.");
          break;
        }
        const amountStr = await p.text({ message: "Amount to Stake" });
        if (p.isCancel(amountStr)) break;

        const gasData = await apiGet("/gas-price");
        const gasPriceStr = await p.text({
          message: "Gas Price",
          placeholder: gasData.suggestedGasPrice,
          initialValue: gasData.suggestedGasPrice,
        });
        if (p.isCancel(gasPriceStr)) break;

        const nonceData = await apiGet(`/nonce/${activeAddr}`);

        const tx = new Transaction({
          from: activeAddr,
          to: "SYSTEM",
          amount: BigInt(amountStr),
          nonce: nonceData.nonce,
          type: "STAKE",
          gasPrice: BigInt(gasPriceStr),
        });
        tx.sign(activeData.wallet);

        const result = await apiPost("/transact", tx);
        if (result.status === "success") {
          p.log.success("Staking transaction submitted!");
        } else {
          p.log.error(`Staking failed: ${result.message}`);
        }
        break;
      }

      case "mine": {
        if (!activeData) {
          p.log.error("No active wallet.");
          break;
        }
        const wallets = await WalletStore.getWallets();
        const mnemonic = wallets[activeName];

        p.log.step("Requesting node to mine a new block...");
        const result = await apiPost("/mine", { validatorMnemonic: mnemonic });
        if (result.status === "success") {
          p.log.success(`Block #${result.block.index} mined by ${activeName}!`);
        } else {
          p.log.error(`Mining failed: ${result.message}`);
        }
        break;
      }
    }
  }

  await WalletStore.close();
  p.outro("Farewell, Guardian of the Chain!");
}

main().catch(p.cancel);
