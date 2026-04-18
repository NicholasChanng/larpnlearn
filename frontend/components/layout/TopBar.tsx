"use client";

import { Heart } from "lucide-react";

import { useUserStore } from "@/store/useUserStore";

/**
 * TopBar — streak, points, lives (hearts), world name.
 *
 * Owner: Track-1 (Frontend-World). Fill out styling + theme-aware icons.
 * Per SRS 4.1.1.
 */
export function TopBar({ worldName }: { worldName?: string }) {
  const { points, streak, lives } = useUserStore();
  return (
    <header className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-6">
        <div className="text-lg font-bold">Aristotle</div>
        {worldName && <div className="text-sm text-muted-foreground">{worldName}</div>}
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">Streak</span>{" "}
          <span className="font-semibold">{streak}🔥</span>
        </div>
        <div>
          <span className="text-muted-foreground">Points</span>{" "}
          <span className="font-semibold">{points}</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              size={18}
              className={i < lives ? "fill-red-500 text-red-500" : "text-muted-foreground"}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
