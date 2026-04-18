"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";

import { TopBar } from "@/components/layout/TopBar";
import { WorldMap } from "@/components/world/WorldMap";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AVAILABLE_THEMES } from "@/lib/theme";
import type { Theme, WorldResponse } from "@/lib/types";
import { useThemeManifest } from "@/lib/useTheme";
import { useAudioStore } from "@/store/useAudioStore";
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
      {manifest?.narrative && (
        <div className="pointer-events-none absolute left-6 top-32 max-w-sm rounded-md border border-yellow-500/30 bg-black/70 p-3 text-xs italic text-yellow-100 shadow-xl backdrop-blur">
          {manifest.narrative}
        </div>
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
  const { muted, toggleMute } = useAudioStore();
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
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={toggleMute} aria-label="toggle audio">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Button>
        <Link href="/skills">
          <Button size="sm" variant="outline">
            Skills
          </Button>
        </Link>
        <Link href="/avatar">
          <Button size="sm" variant="outline">
            Avatar
          </Button>
        </Link>
      </div>
    </div>
  );
}
