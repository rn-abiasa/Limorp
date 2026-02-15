import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  User,
  Wallet,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Repeat,
  Activity,
  Coins,
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

export default function AddressDetail({ blocks }) {
  const { address } = useParams();
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchAddressData = async () => {
      try {
        const balRes = await axios.get(
          `http://localhost:4000/balance/${address}`,
        );
        setBalance(balRes.data.balance || "0");
      } catch (err) {
        console.error("Error fetching address data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAddressData();
  }, [address]);

  // Extract all transactions for this address
  const relatedTxs = (blocks || [])
    .flatMap((b) =>
      (b.transactions || []).map((t) => ({
        ...t,
        block: b.index,
        timestamp: b.timestamp,
      })),
    )
    .filter((t) => t.from === address || t.to === address)
    .reverse();

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-pulse">
        Fetching address data...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link
          to={-1}
          className="p-2 rounded-full hover:bg-zinc-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Account</h1>
          <div className="text-muted-foreground font-mono text-sm break-all">
            {address}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-2 bg-card border-border/60">
          <CardHeader>
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Wallet size={14} /> Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="text-3xl font-black tracking-tighter text-foreground">
                {balance}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  LMR
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Native Asset
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-card border-border/60">
          <CardHeader>
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} /> Account Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-8 outline-none">
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight">
                {relatedTxs.length}
              </div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Total Transactions
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black tracking-tight">
                {relatedTxs.filter((t) => t.type === "CONTRACT_DEPLOY").length}
              </div>
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Contracts Deployed
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight">
          <Repeat size={18} className="text-zinc-500" /> Transaction History
        </h2>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>From/To</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Block</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedTxs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-20 text-muted-foreground italic"
                  >
                    No transactions found for this address.
                  </TableCell>
                </TableRow>
              ) : (
                relatedTxs.map((tx) => {
                  const isSent = tx.from === address;
                  return (
                    <TableRow key={tx.hash} className="group">
                      <TableCell>
                        <Badge
                          variant={isSent ? "secondary" : "success"}
                          className="text-[10px] h-5 flex items-center gap-1 w-fit"
                        >
                          {isSent ? (
                            <ArrowUpRight size={10} />
                          ) : (
                            <ArrowDownLeft size={10} />
                          )}
                          {isSent ? "SENT" : "RECEIVED"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/transaction/${tx.hash}`}
                          className="font-mono text-xs text-cyan-400 hover:underline"
                        >
                          {tx.hash?.slice(0, 16)}...
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={
                              isSent
                                ? "text-zinc-400"
                                : "text-foreground font-bold"
                            }
                          >
                            {tx.from?.slice(0, 8)}...
                          </span>
                          <ArrowRight size={12} className="text-zinc-600" />
                          <span
                            className={
                              !isSent
                                ? "text-zinc-400"
                                : "text-foreground font-bold"
                            }
                          >
                            {tx.to?.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {tx.amount} LMR
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/block/${tx.block}`}>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-zinc-800 hover:bg-zinc-900 cursor-pointer transition-colors"
                          >
                            #{tx.block}
                          </Badge>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
