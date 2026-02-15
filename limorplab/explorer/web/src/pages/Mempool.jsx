import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Clock, Hourglass, Zap } from "lucide-react";

export default function Mempool({ mempool }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mempool</h1>
          <p className="text-muted-foreground mt-1">
            Pending transactions waiting to be included in the next block.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              {(mempool || []).length} Pending
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tx Hash</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Gas Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!mempool || mempool.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Hourglass className="text-zinc-700" size={32} />
                    <p className="text-sm italic">Mempool is currently empty</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              mempool.map((tx) => (
                <TableRow key={tx.hash || Math.random()}>
                  <TableCell className="font-mono text-xs text-amber-500/80">
                    {tx.hash?.slice(0, 16) || "Unknown"}...
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400 font-mono">
                    {tx.from?.slice(0, 10) || "Unknown"}...
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400 font-mono">
                    {tx.to?.slice(0, 10) || "Unknown"}...
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm tracking-tight">
                    {tx.amount || 0} LMR
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-emerald-500 font-mono text-xs font-bold">
                      <Zap size={10} fill="currentColor" />
                      {tx.gasPrice || 1}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
