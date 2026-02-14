import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  Cpu,
  Terminal,
  Database,
  ArrowLeft,
  History,
  Code2,
  Hash,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function ContractDetail({ blocks }) {
  const { address } = useParams();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await axios.get("http://localhost:4000/contracts");
        if (res.data[address]) {
          setContract(res.data[address]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [address]);

  // Find transactions related to this contract
  const relatedTxs = (blocks || [])
    .flatMap((b) =>
      (b.transactions || []).map((t) => ({ ...t, block: b.index })),
    )
    .filter(
      (t) =>
        t.to === address ||
        (t.type === "CONTRACT_DEPLOY" && t.hash === address),
    )
    .reverse();

  if (loading)
    return (
      <div className="py-20 text-center text-muted-foreground">
        Loading contract data...
      </div>
    );

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <h2 className="text-2xl font-bold">Contract Not Found</h2>
        <Link
          to="/contracts"
          className="text-cyan-400 hover:underline inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link
          to="/contracts"
          className="p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight truncate max-w-2xl">
          Contract Detail
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <Cpu size={20} />
                </div>
                <div>
                  <CardTitle className="text-sm font-mono text-zinc-300 break-all">
                    {address}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-500 text-[10px] h-5 uppercase tracking-widest"
                    >
                      Active System
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                      Smart Contract
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  <Database size={14} /> Storage State
                </div>
                <div className="bg-black/50 p-6 rounded-xl border border-border/50 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed overflow-y-auto max-h-[400px]">
                  {JSON.stringify(contract.state, null, 2)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <History size={16} /> Interaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {relatedTxs.map((tx) => (
                  <div
                    key={tx.hash || Math.random()}
                    className="flex items-center justify-between p-4 bg-secondary/40 border border-border/50 rounded-xl hover:bg-secondary/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Terminal size={14} className="text-zinc-500" />
                      <div>
                        {tx.hash ? (
                          <Link
                            to={`/transaction/${tx.hash}`}
                            className="text-sm font-mono text-cyan-400 hover:underline"
                          >
                            {tx.hash.slice(0, 16)}...
                          </Link>
                        ) : (
                          <span className="text-sm font-mono text-muted-foreground">
                            Unknown Hash
                          </span>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-bold">
                          {tx.type || "UNKNOWN"} • Block #{tx.block ?? "?"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {tx.amount || 0} LMR
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Contract Intel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Engine
                </label>
                <div className="text-sm font-medium">Limorp Sandbox VM</div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Language
                </label>
                <div className="text-sm font-medium">
                  ECMAScript (Standard JS)
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                  Mutability
                </label>
                <div className="text-sm font-medium text-amber-500">
                  Mutable (State-based)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/5 border-emerald-500/10">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-emerald-500 flex items-center gap-2 italic uppercase tracking-widest">
                <Zap size={14} fill="currentColor" /> Live Node Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-emerald-500/80 leading-relaxed font-medium">
              Contract state is updated in real-time as transactions are
              validated by the Limestone consensus engine.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const Zap = ({ className, fill, size }) => {
  // Local copy of Zap to handle specific fill prop
  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill || "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
      </svg>
    </div>
  );
};
