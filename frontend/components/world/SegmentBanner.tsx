"use client";

import { motion } from "framer-motion";

import type { ThemeSegment } from "@/lib/types";

export function SegmentBanner({ segment }: { segment: ThemeSegment }) {
  const name = (segment.display_name ?? segment.id).toUpperCase();
  const sub = `◆ ${segment.id.toUpperCase()} ◆`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute inset-x-0 top-12 z-10 flex flex-col items-center gap-1 pointer-events-none"
    >
      <motion.div
        animate={{ opacity: [1, 0.82, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="font-pixel text-5xl font-bold uppercase tracking-widest text-yellow-300"
        style={{
          textShadow:
            "0 0 8px #fde047, 0 0 20px #fbbf24, 0 0 40px #f59e0b, 2px 2px 0 #92400e",
        }}
      >
        {name}
      </motion.div>
      <div
        className="font-pixel text-xs uppercase tracking-[0.3em] text-yellow-500/85"
      >
        {sub}
      </div>
    </motion.div>
  );
}
