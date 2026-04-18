"use client";

import { motion } from "framer-motion";

export function HpBar({
  label,
  hp,
  max,
  align = "left",
}: {
  label: string;
  hp: number;
  max: number;
  align?: "left" | "right";
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  const color = pct > 60 ? "bg-emerald-500" : pct > 25 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className={`w-full max-w-[280px] ${align === "right" ? "ml-auto" : ""}`}>
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-white/80">
        <span className="font-pixel font-bold">{label}</span>
        <span className="font-mono">
          {hp}/{max}
        </span>
      </div>
      <div className="h-4 overflow-hidden rounded-sm border-2 border-black/70 bg-black/50 shadow-inner">
        <motion.div
          className={`h-full ${color}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
