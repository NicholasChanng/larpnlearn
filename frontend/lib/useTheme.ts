"use client";

import { useEffect } from "react";

import { loadThemeManifest } from "./theme";
import type { Theme, ThemeAvatar, ThemeManifest, ThemeMonster, ThemeSegment } from "./types";
import { DEFAULT_AVATAR_CHARACTER, type AvatarCharacterId } from "@/store/useUserStore";
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

/**
 * Resolve the avatar entry for the given character id against the manifest's
 * avatars[]. Manifests list avatars in the canonical order boy/girl/satyr
 * (see public/themes/README.md); we match by `id` first and fall back to the
 * first avatar.
 */
export function avatarForCharacter(
  manifest: ThemeManifest | null,
  characterId: AvatarCharacterId = DEFAULT_AVATAR_CHARACTER,
): ThemeAvatar | null {
  if (!manifest) return null;
  return manifest.avatars.find((a) => a.id === characterId) ?? manifest.avatars[0] ?? null;
}

/**
 * Path to the battle-scene background for a given level. Resolution order:
 *   1. The segment's own `battle_bg` (per-region art).
 *   2. The manifest-level `battle_bg` fallback.
 *   3. `background/battles/battle_hell.png` as the last resort.
 */
export function battleBgForLevel(
  manifest: ThemeManifest | null,
  orderIndex: number,
): string | null {
  if (!manifest) return null;
  const segment = segmentForLevel(manifest, orderIndex);
  return (
    segment?.battle_bg ??
    manifest.battle_bg ??
    `/themes/${manifest.theme_id}/background/battles/battle_hell.png`
  );
}
