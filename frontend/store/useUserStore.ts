"use client";

import { create } from "zustand";

import type { AvatarConfig, User } from "@/lib/types";

interface UserState {
  user: User | null;
  points: number;
  streak: number;
  lives: number;
  avatar: AvatarConfig | null;
  setUser: (user: User) => void;
  setProgress: (args: {
    points: number;
    streak: number;
    lives: number;
    avatar: AvatarConfig;
  }) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  points: 0,
  streak: 0,
  lives: 3,
  avatar: null,
  setUser: (user) =>
    set({
      user,
      points: user.total_points,
      streak: user.current_streak,
      lives: user.lives_remaining,
      avatar: user.avatar_config,
    }),
  setProgress: ({ points, streak, lives, avatar }) =>
    set({ points, streak, lives, avatar }),
}));
