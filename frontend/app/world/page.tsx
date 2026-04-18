"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Level, WorldResponse } from "@/lib/types";
import { useUserStore } from "@/store/useUserStore";

/**
 * World View (SRS 4.1.1, FR-WLD-01..06).
 *
 * Owner: Track-1 (Frontend-World). This is a working stub hitting real API;
 * replace the flat list with a themed winding-path map + avatar sprite.
 */
const DEMO_COURSE_ID = "cs188-sp2024";

export default function WorldPage() {
  const [world, setWorld] = useState<WorldResponse | null>(null);
  const { setUser } = useUserStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [w, u] = await Promise.all([api.world.get(DEMO_COURSE_ID), api.auth.me()]);
      if (cancelled) return;
      setWorld(w);
      setUser(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <TopBar worldName={world ? `${world.theme} · ${world.course_id}` : undefined} />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold">World Map</h1>
        {!world && <p className="text-muted-foreground">Loading…</p>}
        {world && (
          <ol className="space-y-3">
            {world.levels.map((l) => (
              <LevelRow key={l.id} level={l} />
            ))}
          </ol>
        )}
        <div className="mt-8 flex gap-3">
          <Link href="/skills">
            <Button variant="outline">Skills Graph</Button>
          </Link>
          <Link href="/avatar">
            <Button variant="outline">Avatar</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

function LevelRow({ level }: { level: Level }) {
  const label =
    level.exam_type === "final"
      ? "FINAL"
      : level.exam_type === "midterm"
        ? "MIDTERM"
        : `Lecture ${level.order_index}`;
  const disabled = level.state === "locked";
  const href = disabled ? "#" : `/battle/${level.id}`;
  const stateBadge = {
    locked: "🔒 locked",
    available: "⚔️ available",
    completed: "🏁 completed",
  }[level.state];
  return (
    <li
      className={`flex items-center justify-between rounded-lg border border-border bg-background/60 px-4 py-3 ${disabled ? "opacity-50" : "hover:bg-accent"}`}
    >
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">
          segment: {level.theme_segment} · {stateBadge} · {level.monster.name}
        </div>
      </div>
      {!disabled && (
        <Link href={href}>
          <Button size="sm">Enter</Button>
        </Link>
      )}
    </li>
  );
}
