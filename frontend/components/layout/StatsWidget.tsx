"use client";

import { Heart } from "lucide-react";
import { useUserStore } from "@/store/useUserStore";

export function StatsWidget() {
  const { points, streak, lives } = useUserStore();
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3 rounded-lg border-2 border-[#F5F5DC] bg-[#5C3317] px-4 py-3 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="font-pixel text-xs uppercase tracking-widest text-[#F5F5DC]/70">STR</span>
        <span className="font-pixel text-sm font-bold text-[#F5F5DC]">{streak} 🔥</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-pixel text-xs uppercase tracking-widest text-[#F5F5DC]/70">HP</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              size={14}
              className={i < lives ? "fill-red-500 text-red-500" : "text-[#F5F5DC]/30"}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-pixel text-xs uppercase tracking-widest text-[#F5F5DC]/70">PTS</span>
        <span className="font-pixel text-sm font-bold text-[#F5F5DC]">⭐ {points}</span>
      </div>
    </div>
  );
}
