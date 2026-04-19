"use client";

import { create } from "zustand";

import type { AvatarConfig, User } from "@/lib/types";

/**
 * Avatar-character id the user has currently equipped. Resolved against the
 * current theme manifest's `avatars[]` list to pick a sprite path. Default
 * "boy" → greey_boy.png under every theme's `sprites/hero/boy/` folder.
 * Swap this when the avatar-selection UI lands.
 */
export type AvatarCharacterId = "boy" | "girl" | "satyr" | "typhon" | "hades" | "chimera" | "minotaur" | "cyclops" | "hydra" | "medusa" | "cerberus";

export const DEFAULT_AVATAR_CHARACTER: AvatarCharacterId = "boy";

/**
 * Shop price per character, in points. The `boy` starter is free and starts
 * owned. Other characters must be purchased with earned points before they
 * can be equipped.
 */
export const CHARACTER_PRICES: Record<AvatarCharacterId, number> = {
  boy: 0,
  girl: 500,
  satyr: 1000,
  chimera: 1500,
  minotaur: 2000,
  cyclops: 2500,
  typhon: 3000,
  hydra: 3500,
  medusa: 4000,
  cerberus: 4500,
  hades: 5000,
};

export type PurchaseResult = "ok" | "insufficient_points" | "already_owned";

interface UserState {
  user: User | null;
  points: number;
  streak: number;
  lives: number;
  avatar: AvatarConfig | null;
  avatarCharacter: AvatarCharacterId;
  ownedCharacters: AvatarCharacterId[];
  setUser: (user: User) => void;
  setProgress: (args: {
    points: number;
    streak: number;
    lives: number;
    avatar: AvatarConfig;
  }) => void;
  setAvatarCharacter: (id: AvatarCharacterId) => void;
  purchaseCharacter: (id: AvatarCharacterId) => PurchaseResult;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  points: 0,
  streak: 0,
  lives: 3,
  avatar: null,
  avatarCharacter: DEFAULT_AVATAR_CHARACTER,
  ownedCharacters: [DEFAULT_AVATAR_CHARACTER],
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
  setAvatarCharacter: (id) => set({ avatarCharacter: id }),
  purchaseCharacter: (id) => {
    const state = get();
    if (state.ownedCharacters.includes(id)) return "already_owned";
    const price = CHARACTER_PRICES[id];
    if (state.points < price) return "insufficient_points";
    set({
      points: state.points - price,
      ownedCharacters: [...state.ownedCharacters, id],
    });
    return "ok";
  },
}));
