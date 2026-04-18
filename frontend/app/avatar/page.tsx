"use client";

import { useEffect, useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import type { ProgressResponse } from "@/lib/types";

/**
 * Avatar customization (SRS FR-AVT-01..03).
 *
 * Owner: Track-3 (Frontend-Skills+Avatar). Theme-scoped avatar roster,
 * unlockable items, persistence via api.progress.equip / purchase.
 */
export default function AvatarPage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.progress.get().then((p) => {
      if (!cancelled) setProgress(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <TopBar />
      <section className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold">Avatar</h1>
        {!progress && <p className="text-muted-foreground">Loading…</p>}
        {progress && (
          <div className="rounded-lg border border-border p-6">
            <div>
              Base: <span className="font-semibold">{progress.avatar.base_character}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Unlocked: {progress.avatar.unlocked_items.join(", ") || "—"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Points: {progress.points}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
