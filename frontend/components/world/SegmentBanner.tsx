"use client";

import { motion } from "framer-motion";

import type { ThemeSegment } from "@/lib/types";

/**
 * Banner drawn at the start of each segment, between the level nodes.
 * Purely decorative — announces the environment change.
 */
export function SegmentBanner({ segment }: { segment: ThemeSegment }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      className="flex shrink-0 flex-col items-center justify-center px-6"
    >
      <div className="rounded-md border-2 border-yellow-400/60 bg-black/40 px-4 py-2 text-center shadow-2xl backdrop-blur">
        <div className="text-[10px] uppercase tracking-widest text-yellow-300/70">
          {segment.id}
        </div>
        <div className="font-pixel text-sm font-bold text-yellow-100 drop-shadow">
          {segment.display_name ?? segment.id}
        </div>
      </div>
    </motion.div>
  );
}
