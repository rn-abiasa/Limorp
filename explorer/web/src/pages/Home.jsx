import React from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import {
  Box,
  Repeat,
  Activity,
  ArrowRight,
  Server,
  Coins,
  Database,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export default function Home({ stats, blocks }) {
  const chartData = (blocks || []).slice(-15).map((b) => ({
    name: b.index,
    txs: b.transactions?.length || 0,
  }));

  const lastTxs = (blocks || [])
    .flatMap((b) =>
      (b.transactions || []).map((t) => ({ ...t, block: b.index })),
    )
    .slice(-6)
    .reverse();
  const lastBlocks = [...(blocks || [])].slice(-6).reverse();

  const statItems = [
    {
      label: "Network Height",
      value: `#${stats.height}`,
      icon: <Database className="text-zinc-400" size={18} />,
    },
    {
      label: "Mempool Txs",
      value: stats.mempoolSize,
      icon: <Server className="text-zinc-400" size={18} />,
    },
    {
      label: "Total Staked",
      value: `${stats.totalStaked} LMR`,
      icon: <Coins className="text-zinc-400" size={18} />,
    },
    {
      label: "Total Volume",
      value: stats.totalTransactions,
      icon: <Activity className="text-zinc-400" size={18} />,
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Network Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time data from the Limorp node scanner.
          </p>
        </div>
        <div className="flex items-center h-10 px-4 bg-zinc-900/50 border border-border rounded-lg text-xs font-medium text-zinc-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Network Stats - Subtle Divider Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-4 px-2 border-y border-border/50">
        {statItems.map((item, idx) => (
          <div
            key={idx}
            className="space-y-2 border-r last:border-0 border-border/50 pr-4"
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              {item.icon} {item.label}
            </div>
            <div className="text-2xl font-bold tracking-tight">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Trend Chart */}
      <Card className="bg-zinc-950 border-border/60">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transaction Throughput (Last 15 Blocks)
          </CardTitle>
          <Badge
            variant="success"
            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-2 py-0"
          >
            LIVE
          </Badge>
        </CardHeader>
        <CardContent className="p-0 h-[100px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="txs"
                stroke="#fafafa"
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Latest Blocks */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Box className="text-zinc-300" size={18} /> Latest Blocks
            </h2>
            <Link
              to="/blocks"
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group"
            >
              View all{" "}
              <ArrowRight
                size={12}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </div>

          <div className="space-y-4">
            {lastBlocks.map((block) => (
              <Link
                key={block.index}
                to={`/block/${block.index}`}
                className="group flex items-center justify-between p-4 bg-secondary/30 backdrop-blur-sm border border-border/50 rounded-2xl hover:bg-secondary/50 hover:border-border transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-border flex items-center justify-center font-bold text-xs group-hover:bg-zinc-800 transition-colors">
                    {block.index}
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-tight text-foreground">
                      Block #{block.index}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {block.transactions.length} transactions
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                    {block.hash?.slice(0, 16)}...
                  </div>
                  <div className="text-[10px] text-zinc-600 font-medium">
                    Validated by{" "}
                    <Link
                      to={`/address/${block.validator}`}
                      className="hover:underline text-zinc-500"
                    >
                      {block.validator?.slice(0, 8)}...
                    </Link>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Latest Transactions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Repeat className="text-zinc-300" size={18} /> Latest Transactions
            </h2>
            <Link
              to="/transactions"
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group"
            >
              View all{" "}
              <ArrowRight
                size={12}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </div>

          <div className="space-y-4">
            {lastTxs.map((tx) => (
              <Link
                key={tx.hash}
                to={`/transaction/${tx.hash}`}
                className="flex items-center justify-between p-4 glass rounded-2xl hover:border-zinc-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-border flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                    <Activity size={16} className="text-zinc-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-tight text-foreground">
                      {tx.from?.slice(0, 6)}...{" "}
                      <span className="text-zinc-600 mx-1">→</span>{" "}
                      {tx.to?.slice(0, 6)}...
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      HASH: {tx.hash?.slice(0, 12)}...
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <Badge
                    variant="outline"
                    className="border-border/60 text-[10px] h-5 px-1.5"
                  >
                    {tx.amount} LMR
                  </Badge>
                  <div className="text-[10px] text-zinc-600 mt-1 font-medium italic">
                    Confirmed in Block #{tx.block}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
