"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { audio } from "@/lib/audio";

interface AudioState {
  muted: boolean;
  volume: number;
  init: () => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      muted: false,
      volume: 0.6,
      init: () => {
        audio.init();
        audio.setVolume(get().volume);
        audio.setMuted(get().muted);
      },
      toggleMute: () => {
        const next = !get().muted;
        audio.setMuted(next);
        set({ muted: next });
      },
      setVolume: (v) => {
        const clamped = Math.max(0, Math.min(1, v));
        audio.setVolume(clamped);
        set({ volume: clamped });
      },
    }),
    {
      name: "aristotle-audio",
      partialize: (state) => ({ muted: state.muted, volume: state.volume }),
    },
  ),
);
