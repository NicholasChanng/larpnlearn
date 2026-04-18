/**
 * Theme manifest loader.
 *
 * Manifests live in public/themes/{theme_id}/manifest.json per SRS 11.1.
 * Owner: Track-1 (Frontend-World) wires this into the theme switcher;
 * Track-6 populates the actual manifest files + assets.
 */

import type { Theme, ThemeManifest } from "./types";

export async function loadThemeManifest(theme: Theme): Promise<ThemeManifest> {
  const res = await fetch(`/themes/${theme}/manifest.json`);
  if (!res.ok) throw new Error(`Failed to load theme ${theme}`);
  return res.json();
}

export const AVAILABLE_THEMES: Theme[] = ["greek", "mario", "pokemon"];
