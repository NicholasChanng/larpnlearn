"use client";

import { create } from "zustand";

import { audio } from "@/lib/audio";

interface AudioState {
  muted: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (v: number) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: false,
  volume: 0.6,
  toggleMute: () => {
    const next = !get().muted;
    audio.setMuted(next);
    set({ muted: next });
  },
  setVolume: (v) => {
    audio.setVolume(v);
    set({ volume: v });
  },
}));
