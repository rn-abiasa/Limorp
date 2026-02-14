import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Cpu, Terminal, Code2, Database } from "lucide-react";

export default function Contracts() {
  const [contracts, setContracts] = useState({});

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await axios.get("http://localhost:4000/contracts");
        setContracts(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchContracts();
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(contracts).length === 0 ? (
          <Card className="col-span-full border-dashed border-zinc-800 bg-zinc-950/20 py-20 flex flex-col items-center justify-center gap-4">
            <Code2 className="text-zinc-800" size={48} />
            <p className="text-muted-foreground text-sm font-medium italic">
              No contracts found on-chain.
            </p>
          </Card>
        ) : (
          Object.entries(contracts).map(([address, data]) => (
            <Card
              key={address}
              className="overflow-hidden border-border bg-zinc-950/40 hover:bg-zinc-950/60 transition-colors"
            >
              <CardHeader className="p-4 bg-zinc-900/30 flex flex-row items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center text-background">
                    <Cpu size={16} />
                  </div>
                  <Link
                    to={`/contract/${address}`}
                    className="font-mono text-[10px] text-cyan-400 hover:underline tracking-tight"
                  >
                    {address}
                  </Link>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/20 text-emerald-500"
                >
                  ACTIVE
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <Database size={12} /> Current State
                  </div>
                  <div className="bg-black/50 p-4 rounded-lg border border-border/40">
                    <pre className="text-[10px] font-mono leading-relaxed text-zinc-300">
                      {JSON.stringify(data.state, null, 2)}
                    </pre>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-medium">
                  <Terminal size={12} />
                  Validated by network consensus
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
