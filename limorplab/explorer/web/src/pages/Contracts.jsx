import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Cpu, Terminal, Code2, Database, User, Calendar } from "lucide-react";

export default function Contracts() {
  const [contracts, setContracts] = useState({});

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/contracts");
        setContracts(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchContracts();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Smart Contracts
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of decentralized logic and state storage.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {Object.keys(contracts).length} Deployed
        </Badge>
      </div>

      <Card className="border-border bg-zinc-950/40 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[300px] text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Contract Address
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Type
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Creator
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Deployed At
                </TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.keys(contracts).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-48 text-center text-muted-foreground italic"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Code2 size={32} className="text-zinc-800" />
                      No contracts found on-chain.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(contracts).map(([address, data]) => (
                  <TableRow
                    key={address}
                    className="border-border/50 hover:bg-zinc-900/30 transition-colors"
                  >
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <Cpu size={12} />
                        </div>
                        <Link
                          to={`/contract/${address}`}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline tracking-tight"
                        >
                          {address.substring(0, 20)}...
                          {address.substring(address.length - 4)}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-tighter bg-zinc-900/50 border-zinc-800"
                      >
                        {data.detectedType || "GENERIC"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <User size={10} className="text-zinc-600" />
                        <Link
                          to={`/address/${data.metadata?.creator}`}
                          className="hover:text-white transition-colors"
                        >
                          {data.metadata?.creator
                            ? `${data.metadata.creator.substring(0, 10)}...`
                            : "Unknown"}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <Calendar size={10} className="text-zinc-600" />
                        {formatDate(data.metadata?.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className="text-[9px] border-emerald-500/20 text-emerald-500 bg-emerald-500/5 whitespace-nowrap"
                      >
                        ACTIVE
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
