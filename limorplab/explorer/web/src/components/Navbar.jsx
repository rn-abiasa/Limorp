import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Box,
  Repeat,
  Clock,
  Cpu,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "../utils/utils";
import { useState, useEffect } from "react";

export default function Navbar() {
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const navItems = [
    { path: "/", label: "Overview", icon: <LayoutDashboard size={16} /> },
    { path: "/blocks", label: "Blocks", icon: <Box size={16} /> },
    {
      path: "/transactions",
      label: "Transactions",
      icon: <Repeat size={16} />,
    },
    { path: "/mempool", label: "Mempool", icon: <Clock size={16} /> },
    { path: "/contracts", label: "Contracts", icon: <Cpu size={16} /> },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-bold text-lg tracking-tight">
                Limorp<span className="text-zinc-500 font-medium">Scan</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-secondary text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-secondary border border-border rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-muted-foreground">
                Devnet Live
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
