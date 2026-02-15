// Global Fix for BigInt JSON serialization
BigInt.prototype.toJSON = function () {
  return this.toString();
};

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
    body: JSON.stringify(body),
  });
  return res.json();
}

import { execSync } from "child_process";

function copyToClipboard(text) {
  try {
    if (process.platform === "darwin") {
      execSync(`echo "${text}" | pbcopy`);
    } else {
      // Try Termux clipboard first, then xclip
      try {
        execSync(`echo "${text}" | termux-clipboard-set`);
      } catch {
        execSync(`echo "${text}" | xclip -selection clipboard`);
      }
    }
    p.log.success("Copied to clipboard!");
  } catch (err) {
    p.log.warn("Auto-copy failed. Please copy this manually:");
    console.log(color.bold(color.cyan(text)));
  }
}

async function main() {
  p.intro(color.bgCyan(color.black(" Limorp Blockchain CLI (API-Mode) ")));

  // Auto-Onboarding: Create "default" wallet if none exist
  const existingWallets = await WalletStore.getWallets();
  if (Object.keys(existingWallets).length === 0) {
    p.log.info(
      color.yellow(
        "✨ No wallets found. Generating your first 'default' wallet...",
      ),
    );
    const { mnemonic, wallet } = Wallet.create();
    await WalletStore.saveWallet("default", mnemonic);
    await WalletStore.setActiveWallet("default");

    p.note(
      `${color.bold(color.green(mnemonic))}\n\n${color.dim("Address: " + wallet.publicKey)}`,
      "Action Required: Save your Mnemonic!",
    );
    p.log.success("Wallet 'default' created and set as active!");
  }

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
        { value: "transfer", label: "Transfer" },
        { value: "manage", label: "Manage Wallet" },
        { value: "create", label: "Create New Wallet" },
        { value: "import", label: "Import Wallet" },
        { value: "exit", label: "Exit" },
      ],
    });

    if (p.isCancel(action) || action === "exit") break;

    switch (action) {
      case "transfer": {
        if (!activeData) {
          p.log.error("No active wallet.");
          break;
        }
        const to = await p.text({ message: "Recipient Address" });
        if (p.isCancel(to)) break;
        const amountStr = await p.text({ message: "Amount" });
        if (p.isCancel(amountStr)) break;

        const minFeeData = await apiGet("/min-fee");
        const feeStr = await p.text({
          message: "Transaction Fee (higher = priority)",
          placeholder: minFeeData.minFee,
          initialValue: minFeeData.minFee,
        });
        if (p.isCancel(feeStr)) break;

        const nonceData = await apiGet(`/nonce/${activeAddr}`);

        const tx = new Transaction({
          from: activeAddr,
          to,
          amount: BigInt(amountStr),
          nonce: nonceData.nonce,
          fee: BigInt(feeStr),
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

      case "manage": {
        const subAction = await p.select({
          message: `Manage Wallet [${activeName}]`,
          options: [
            { value: "view", label: "View Details" },
            { value: "copy-addr", label: "Copy Address" },
            { value: "copy-mnem", label: "Copy Mnemonic" },
            { value: "switch", label: "Switch Active Wallet" },
            { value: "back", label: "Back to Main" },
          ],
        });

        if (p.isCancel(subAction) || subAction === "back") break;

        if (subAction === "view") {
          p.note(
            `Name: ${activeName}\nAddress: ${activeAddr}\nBalance: ${balance} LMR`,
            "Wallet Details",
          );
        } else if (subAction === "copy-addr") {
          copyToClipboard(activeAddr);
        } else if (subAction === "copy-mnem") {
          const wallets = await WalletStore.getWallets();
          const mnemonic = wallets[activeName];
          copyToClipboard(mnemonic);
        } else if (subAction === "switch") {
          const wallets = await WalletStore.getWallets();
          const names = Object.keys(wallets);
          const selected = await p.select({
            message: "Select Wallet",
            options: names.map((n) => ({ value: n, label: n })),
          });
          if (p.isCancel(selected)) break;
          await WalletStore.setActiveWallet(selected);
          p.log.success(`Active wallet switched to ${selected}`);
        }
        break;
      }

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
    }
  }

  await WalletStore.close();
  p.outro("Farewell, Guardian of the Chain!");
}

main().catch(p.cancel);
