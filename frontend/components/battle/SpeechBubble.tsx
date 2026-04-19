"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function SpeechBubble({
  text,
  from = "right",
  className,
}: {
  text: string;
  from?: "left" | "right";
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "relative max-w-xl rounded-2xl border-4 border-black bg-white px-5 py-4 text-slate-900 shadow-2xl",
        from === "right" ? "mr-6" : "ml-6",
        className,
      )}
    >
      <p className="font-pixel text-sm leading-relaxed">{text}</p>
      <div
        className={`absolute top-full h-0 w-0 border-x-[18px] border-t-[22px] border-x-transparent border-t-black ${
          from === "right" ? "right-8" : "left-8"
        }`}
      />
      <div
        className={`absolute top-full h-0 w-0 border-x-[12px] border-t-[16px] border-x-transparent border-t-white ${
          from === "right" ? "right-11" : "left-11"
        }`}
        style={{ transform: "translateY(-3px)" }}
      />
    </motion.div>
  );
}
