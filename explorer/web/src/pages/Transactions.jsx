import React from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Repeat, ArrowRight, ExternalLink } from "lucide-react";

export default function Transactions({ blocks }) {
  const allTxs = (blocks || [])
    .flatMap((b) =>
      (b.transactions || []).map((t) => ({
        ...t,
        block: b.index,
        time: b.timestamp,
      })),
    )
    .reverse();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Full history of asset transfers and network activity.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {allTxs.length} Total Txs
        </Badge>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tx Hash</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>From / To</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Block</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTxs.map((tx) => (
              <TableRow key={tx.hash} className="group">
                <TableCell>
                  <Link
                    to={tx.hash ? `/transaction/${tx.hash}` : "#"}
                    className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <Repeat size={14} className="text-zinc-500" />
                    <span className="font-mono text-xs truncate max-w-[120px] hover:underline">
                      {tx.hash || "Unknown"}
                    </span>
                    <ExternalLink
                      size={10}
                      className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={tx.type === "TRANSFER" ? "success" : "warning"}
                    className="text-[10px] font-bold tracking-tight px-2 h-5"
                  >
                    {tx.type || "UNKNOWN"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Link
                      to={`/address/${tx.from}`}
                      className="text-cyan-400 hover:underline"
                    >
                      {tx.from?.slice(0, 8) || "Unknown"}...
                    </Link>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <Link
                      to={`/address/${tx.to}`}
                      className="text-cyan-400 hover:underline"
                    >
                      {tx.to?.slice(0, 8) || "Unknown"}...
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-bold tracking-tight">
                    {tx.amount || 0}{" "}
                    <span className="text-[10px] text-zinc-500">LMR</span>
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link to={`/block/${tx.block}`}>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-border bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors"
                    >
                      #{tx.block ?? "?"}
                    </Badge>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
