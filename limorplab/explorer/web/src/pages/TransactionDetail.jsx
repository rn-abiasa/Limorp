import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  Repeat,
  Hash,
  User,
  Coins,
  Calendar,
  ArrowLeft,
  Box,
  Zap,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function TransactionDetail({ blocks }) {
  const { hash } = useParams();

  // Find transaction in blocks
  let tx = null;
  let blockInfo = null;

  if (blocks && Array.isArray(blocks)) {
    for (const block of blocks) {
      if (!block.transactions) continue;
      const found = block.transactions.find((t) => t.hash === hash);
      if (found) {
        tx = found;
        blockInfo = block;
        break;
      }
    }
  }

  if (!tx) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <h2 className="text-2xl font-bold">Transaction Not Found</h2>
        <Link
          to="/transactions"
          className="text-cyan-400 hover:underline inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Transactions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link
          to="/transactions"
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Transaction Detail
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-4 px-6 bg-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/50 border border-border flex items-center justify-center text-zinc-400">
              <Repeat size={20} />
            </div>
            <div>
              <CardTitle className="text-sm font-mono text-zinc-300 break-all">
                {tx.hash}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={
                    tx.type === "TRANSFER"
                      ? "success"
                      : tx.type === "REWARD"
                        ? "secondary"
                        : "warning"
                  }
                  className="text-[10px] h-5 uppercase tracking-wider"
                >
                  {tx.type === "REWARD" ? "Block Reward" : tx.type}
                </Badge>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                  Transaction
                </span>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <Badge
              variant="outline"
              className="border-border/60 bg-zinc-900/50 text-xs py-1 px-3"
            >
              Confirmed in Block #{blockInfo.index}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border/40">
          <DetailRow
            label="Status"
            icon={<Zap size={14} className="text-emerald-500" />}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-500">
                Success
              </span>
            </div>
          </DetailRow>

          <DetailRow label="Block" icon={<Box size={14} />}>
            <Link
              to={`/block/${blockInfo.index}`}
              className="text-sm font-bold text-cyan-400 hover:underline"
            >
              #{blockInfo.index}
            </Link>
            <span className="text-xs text-muted-foreground ml-2">
              ({new Date(tx.timestamp || blockInfo.timestamp).toLocaleString()})
            </span>
          </DetailRow>

          <DetailRow label="From" icon={<User size={14} />}>
            <Link
              to={`/address/${tx.from || "Unknown"}`}
              className="text-sm font-mono text-cyan-400 hover:underline break-all"
            >
              {tx.from || "SYSTEM"}
            </Link>
          </DetailRow>

          <DetailRow label="To" icon={<User size={14} />}>
            <Link
              to={`/address/${tx.to || "Unknown"}`}
              className="text-sm font-mono text-cyan-400 hover:underline break-all"
            >
              {tx.to || "SYSTEM"}
            </Link>
          </DetailRow>

          <DetailRow label="Amount" icon={<Coins size={14} />}>
            <div className="text-lg font-bold tracking-tight">
              {tx.amount}{" "}
              <span className="text-xs text-muted-foreground font-medium">
                LMR
              </span>
            </div>
          </DetailRow>

          <DetailRow label="Transaction Fee" icon={<Hash size={14} />}>
            <div className="text-sm font-medium text-zinc-300">
              {tx.fee || 0} LMR
              {tx.type === "REWARD" && (
                <span className="text-xs text-muted-foreground ml-2">
                  (System Generated)
                </span>
              )}
            </div>
          </DetailRow>

          <DetailRow label="Nonce" icon={<Hash size={14} />}>
            <span className="text-sm font-mono text-zinc-400">{tx.nonce}</span>
          </DetailRow>
        </CardContent>
      </Card>

      {tx.code && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Contract Code / Input
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-black/50 p-6 rounded-xl border border-border/50 text-xs font-mono text-emerald-400 overflow-x-auto">
              {tx.code}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({ label, icon, children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 p-6 items-start">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest pt-1">
        {icon} {label}
      </div>
      <div className="md:col-span-3">{children}</div>
    </div>
  );
}
