"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { Level } from "@/lib/types";

interface LevelNodeProps {
  level: Level;
  isCurrent: boolean;
  avatarEmoji: string;
  avatarSprite?: string | null;
}

/**
 * Trophy-road style node. Circular sprite with state-dependent coloring,
 * bouncy hover, and the player avatar pinned to the current level.
 */
export function LevelNode({
  level,
  isCurrent,
  avatarEmoji,
  avatarSprite,
}: LevelNodeProps) {
  const disabled = level.state === "locked";
  const isExam = level.is_exam;
  const label =
    level.exam_type === "final"
      ? "FINAL"
      : level.exam_type === "midterm"
        ? "MIDTERM"
        : `L${level.order_index}`;

  const size = isExam ? "h-[72px] w-[72px]" : "h-[60px] w-[60px]";
  const borderColor =
    level.state === "completed"
      ? "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.7)]"
      : level.state === "available"
        ? cn(
            "border-yellow-300 shadow-[0_0_35px_rgba(252,211,77,0.9)]",
            !isCurrent && "animate-pulse",
          )
        : "border-slate-600";

  const bgColor = isExam
    ? "bg-gradient-to-br from-red-800 to-red-950"
    : level.state === "completed"
      ? "bg-gradient-to-br from-emerald-700 to-emerald-950"
      : level.state === "available"
        ? "bg-gradient-to-br from-yellow-600 to-yellow-900"
        : "bg-gradient-to-br from-slate-700 to-slate-900";

  const content = (
    <motion.div
      whileHover={disabled ? {} : { scale: 1.1, y: -4 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      className={cn(
        "relative flex shrink-0 cursor-pointer flex-col items-center",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {isCurrent && (
        <div className="absolute bottom-full left-1/2 mb-2 ml-[-84px] h-[168px] w-[168px]">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {avatarSprite ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSprite}
                alt="avatar"
                width={168}
                height={168}
                className="h-[168px] w-[168px] object-contain drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]"
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <span className="inline-block text-9xl">{avatarEmoji}</span>
            )}
          </motion.div>
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full border-4",
          "transition-all duration-300",
          size,
          borderColor,
          bgColor,
        )}
      >
        {level.state === "locked" && (
          <span className="text-2xl drop-shadow-lg" style={{ filter: "grayscale(1) brightness(0.5)" }}>
            🔒
          </span>
        )}
      </div>

      <div className="mt-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-yellow-100 backdrop-blur">
        {label}
      </div>
    </motion.div>
  );

  if (disabled) return content;
  return <Link href={`/battle/${level.id}`}>{content}</Link>;
}
