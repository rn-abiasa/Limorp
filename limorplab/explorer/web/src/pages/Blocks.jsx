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
import { Box as BoxIcon, Clock } from "lucide-react";

export default function Blocks({ blocks }) {
  const sortedBlocks = [...(blocks || [])].reverse();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Blocks</h1>
          <p className="text-muted-foreground mt-1">
            Detailed history of all verified blocks on the network.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {(blocks || []).length} Total Blocks
        </Badge>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Index</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Validator</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBlocks.map((block) => (
              <TableRow key={block.index} className="group">
                <TableCell>
                  <Link
                    to={`/block/${block.index}`}
                    className="flex items-center gap-2 font-bold text-cyan-400 hover:underline"
                  >
                    <BoxIcon size={14} className="text-zinc-500" />#
                    {block.index}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                  <Link
                    to={`/block/${block.index}`}
                    className="hover:underline"
                  >
                    {block.hash}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {block.validator?.charAt(0) || "?"}
                    </div>
                    <Link
                      to={`/address/${block.validator}`}
                      className="text-xs font-medium text-cyan-400 hover:underline capitalize"
                    >
                      {block.validator?.slice(0, 12) || "Unknown"}...
                    </Link>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {block.transactions?.length || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-500 font-medium">
                    <Clock size={12} />
                    {new Date(block.timestamp).toLocaleTimeString()}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
