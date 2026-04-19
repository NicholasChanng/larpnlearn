"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { Level, ThemeMonster } from "@/lib/types";

interface LevelNodeProps {
  level: Level;
  monster: ThemeMonster | null;
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
  monster,
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

  const size = isExam ? "h-24 w-24" : "h-20 w-20";
  const borderColor =
    level.state === "completed"
      ? "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.7)]"
      : level.state === "available"
        ? "border-yellow-300 shadow-[0_0_35px_rgba(252,211,77,0.9)] animate-pulse"
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
        <motion.div
          className="absolute -top-16"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {avatarSprite ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSprite}
              alt="avatar"
              width={56}
              height={56}
              className="h-14 w-14 object-contain drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <span className="text-3xl">{avatarEmoji}</span>
          )}
        </motion.div>
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
        {level.state === "locked" ? (
          <span className="text-4xl drop-shadow-lg" style={{ filter: "grayscale(1) brightness(0.5)" }}>
            🔒
          </span>
        ) : monster?.sprite_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={monster.sprite_path}
            alt={monster.name}
            width={72}
            height={72}
            className="h-[80%] w-[80%] object-contain"
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <span className="text-4xl drop-shadow-lg">{monster?.emoji ?? "❓"}</span>
        )}
      </div>

      <div className="mt-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-yellow-100 backdrop-blur">
        {label}
      </div>
      {!disabled && monster && (
        <div className="mt-1 max-w-[110px] truncate text-[10px] text-slate-200">
          {monster.name}
        </div>
      )}
    </motion.div>
  );

  if (disabled) return content;
  return <Link href={`/battle/${level.id}`}>{content}</Link>;
}
