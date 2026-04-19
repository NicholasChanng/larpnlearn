"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StatsWidget } from "@/components/layout/StatsWidget";
import { WorldMap } from "@/components/world/WorldMap";
import { api } from "@/lib/api";
import type { WorldResponse } from "@/lib/types";
import { useThemeManifest } from "@/lib/useTheme";
import { useThemeStore } from "@/store/useThemeStore";
import { useUserStore } from "@/store/useUserStore";

const DEMO_COURSE_ID = "cs188-sp2024";

export default function WorldPage() {
  const [world, setWorld] = useState<WorldResponse | null>(null);
  const { setUser } = useUserStore();
  const setTheme = useThemeStore((s) => s.setTheme);
  const manifest = useThemeManifest();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [w, u] = await Promise.all([api.world.get(DEMO_COURSE_ID), api.auth.me()]);
      if (cancelled) return;
      setWorld(w);
      setTheme(w.theme);
      setUser(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setTheme]);

  const loading = !world || !manifest;

  return (
    <main className="min-h-screen bg-black">
      <StatsWidget />
      {loading && (
        <div className="flex h-screen items-center justify-center text-slate-400">
          Summoning your world…
        </div>
      )}
      {!loading && world && manifest && (
        <WorldMap
          levels={world.levels}
          manifest={manifest}
          currentLevelId={world.current_level_id}
        />
      )}
    </main>
  );
}


