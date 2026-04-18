"use client";

import { create } from "zustand";

import type { Theme, ThemeManifest } from "@/lib/types";

interface ThemeState {
  theme: Theme;
  manifest: ThemeManifest | null;
  setTheme: (theme: Theme) => void;
  setManifest: (manifest: ThemeManifest) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: "greek",
  manifest: null,
  setTheme: (theme) => set({ theme }),
  setManifest: (manifest) => set({ manifest }),
}));
