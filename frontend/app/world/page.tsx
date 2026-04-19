"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { WorldMap } from "@/components/world/WorldMap";
import { api } from "@/lib/api";
import { AVAILABLE_THEMES } from "@/lib/theme";
import type { Theme, WorldResponse } from "@/lib/types";
import { useThemeManifest } from "@/lib/useTheme";
import { useThemeStore } from "@/store/useThemeStore";
import { useUserStore } from "@/store/useUserStore";

const DEMO_COURSE_ID = "cs188-sp2024";

export default function WorldPage() {
  const [world, setWorld] = useState<WorldResponse | null>(null);
  const { setUser } = useUserStore();
  const setTheme = useThemeStore((s) => s.setTheme);
  const currentTheme = useThemeStore((s) => s.theme);
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
      <TopBar worldName={manifest?.display_name} />
      <ToolRow currentTheme={currentTheme} setTheme={setTheme} />
      {loading && (
        <div className="flex h-[calc(100vh-120px)] items-center justify-center text-slate-400">
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

function ToolRow({
  currentTheme,
  setTheme,
}: {
  currentTheme: Theme;
  setTheme: (t: Theme) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-black/60 px-6 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>Theme:</span>
        {AVAILABLE_THEMES.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`rounded px-2 py-1 text-xs font-semibold ${
              currentTheme === t ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

