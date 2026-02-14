import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  Box,
  Calendar,
  User,
  Hash,
  ArrowLeft,
  Repeat,
  Activity,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";

export default function BlockDetail({ blocks }) {
  const { index } = useParams();
  const block = blocks?.find((b) => String(b.index) === String(index));

  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <h2 className="text-2xl font-bold">Block Not Found</h2>
        <Link
          to="/blocks"
          className="text-cyan-400 hover:underline inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Blocks
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link
          to="/blocks"
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Block #{block.index}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Block Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                  <Hash size={12} /> Hash
                </div>
                <div className="text-sm font-mono break-all bg-zinc-900/50 p-3 rounded-lg border border-border/50">
                  {block.hash}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                  <Hash size={12} /> Previous Hash
                </div>
                <div className="text-sm font-mono break-all bg-zinc-900/50 p-3 rounded-lg border border-border/50">
                  {block.lastHash}
                </div>
              </div>
            </div>

            <div className="p-4 bg-secondary/30 border border-border/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                  Validator
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                    {block.validator?.charAt(0) || "?"}
                  </div>
                  <Link
                    to={`/address/${block.validator}`}
                    className="text-sm font-medium text-cyan-400 hover:underline truncate max-w-[150px]"
                  >
                    {block.validator || "Unknown"}
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                  Timestamp
                </span>
                <div className="text-sm font-medium">
                  {new Date(block.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Network Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-secondary/30 border border-border/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                    Transactions
                  </span>
                  <div className="text-xl font-black mt-1">
                    {block.transactions?.length || 0} Txs
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-primary">
                  <Repeat size={20} />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground">
                Confirmations
              </span>
              <Badge variant="success" className="h-5 px-1.5 text-[10px]">
                VERIFIED
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-xs text-muted-foreground">Difficulty</span>
              <span className="text-xs font-mono">
                PoS (Validator Selection)
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-muted-foreground">
                Block Reward
              </span>
              <span className="text-xs font-bold text-emerald-500">
                50 LMR + Fees
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Repeat size={20} className="text-muted-foreground" /> Transactions in
          this Block
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tx Hash</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!block.transactions || block.transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground italic"
                  >
                    No transactions in this block.
                  </TableCell>
                </TableRow>
              ) : (
                block.transactions.map((tx) => (
                  <TableRow key={tx.hash} className="group">
                    <TableCell>
                      <Link
                        to={`/transaction/${tx.hash}`}
                        className="font-mono text-xs text-cyan-400 hover:underline"
                      >
                        {tx.hash?.slice(0, 16)}...
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.type === "TRANSFER" ? "success" : "warning"}
                        className="text-[10px] h-5"
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      <Link
                        to={`/address/${tx.from}`}
                        className="text-cyan-400 hover:underline"
                      >
                        {tx.from?.slice(0, 12)}...
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      <Link
                        to={`/address/${tx.to}`}
                        className="text-cyan-400 hover:underline"
                      >
                        {tx.to?.slice(0, 12)}...
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {tx.amount} LMR
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
