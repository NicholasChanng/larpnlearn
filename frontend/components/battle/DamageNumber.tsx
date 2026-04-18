"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export interface DamagePop {
  id: number;
  value: number;
  side: "user" | "monster";
  color: "red" | "green";
}

export function DamageNumbers({ pops, children }: { pops: DamagePop[]; children?: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <AnimatePresence>
        {pops.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -80, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute top-1/2 font-pixel text-3xl font-black drop-shadow-[2px_2px_0_rgba(0,0,0,1)] ${
              p.side === "user" ? "left-[20%]" : "right-[20%]"
            } ${p.color === "red" ? "text-red-400" : "text-emerald-400"}`}
          >
            {p.value > 0 ? `-${p.value}` : "MISS"}
          </motion.div>
        ))}
      </AnimatePresence>
      {children}
    </div>
  );
}
