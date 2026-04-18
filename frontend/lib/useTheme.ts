"use client";

import { useEffect } from "react";

import { loadThemeManifest } from "./theme";
import type { Theme, ThemeManifest, ThemeMonster, ThemeSegment } from "./types";
import { useThemeStore } from "@/store/useThemeStore";

/**
 * Hook that loads the current theme manifest once and keeps it in the
 * Zustand store. Returns the active manifest (or null while loading).
 */
export function useThemeManifest(theme?: Theme): ThemeManifest | null {
  const active = useThemeStore((s) => s.theme);
  const manifest = useThemeStore((s) => s.manifest);
  const setManifest = useThemeStore((s) => s.setManifest);

  const requested = theme ?? active;

  useEffect(() => {
    let cancelled = false;
    if (manifest?.theme_id === requested) return;
    loadThemeManifest(requested).then((m) => {
      if (!cancelled) setManifest(m);
    });
    return () => {
      cancelled = true;
    };
  }, [requested, manifest, setManifest]);

  return manifest?.theme_id === requested ? manifest : null;
}

export function segmentForLevel(manifest: ThemeManifest | null, orderIndex: number): ThemeSegment | null {
  if (!manifest) return null;
  return manifest.segments.find((s) => orderIndex >= s.range[0] && orderIndex <= s.range[1]) ?? null;
}

/**
 * Pick a monster for a given level order within its segment.
 *
 * Rules:
 *   - Exam levels always get the boss tier monster of that segment.
 *   - Regular levels cycle through the segment's non-boss monsters deterministically.
 */
export function monsterForLevel(
  manifest: ThemeManifest | null,
  orderIndex: number,
  isExam: boolean,
): ThemeMonster | null {
  if (!manifest) return null;
  const segment = segmentForLevel(manifest, orderIndex);
  if (!segment) return null;
  const pool = manifest.monsters.filter((m) => m.segment === segment.id);
  if (pool.length === 0) return null;
  if (isExam) {
    return pool.find((m) => m.hp_tier === "boss") ?? pool[pool.length - 1];
  }
  const regulars = pool.filter((m) => m.hp_tier !== "boss");
  if (regulars.length === 0) return pool[0];
  const offsetWithinSegment = orderIndex - segment.range[0];
  return regulars[offsetWithinSegment % regulars.length];
}
