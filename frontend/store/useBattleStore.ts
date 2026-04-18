"use client";

import { create } from "zustand";

import type { MonsterConfig, Question, QuestionAttempt } from "@/lib/types";

interface BattleState {
  battleId: string | null;
  currentQuestion: Question | null;
  monster: MonsterConfig | null;
  userHp: number;
  userHpMax: number;
  monsterHp: number;
  monsterHpMax: number;
  attempts: QuestionAttempt[];
  isSubmitting: boolean;
  setBattle: (args: {
    battleId: string;
    question: Question;
    monster: MonsterConfig;
    userHp: number;
    monsterHp: number;
  }) => void;
  applyAnswer: (args: {
    userHp: number;
    monsterHp: number;
    nextQuestion: Question | null;
  }) => void;
  reset: () => void;
  setSubmitting: (v: boolean) => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  battleId: null,
  currentQuestion: null,
  monster: null,
  userHp: 0,
  userHpMax: 0,
  monsterHp: 0,
  monsterHpMax: 0,
  attempts: [],
  isSubmitting: false,
  setBattle: ({ battleId, question, monster, userHp, monsterHp }) =>
    set({
      battleId,
      currentQuestion: question,
      monster,
      userHp,
      userHpMax: userHp,
      monsterHp,
      monsterHpMax: monsterHp,
      attempts: [],
    }),
  applyAnswer: ({ userHp, monsterHp, nextQuestion }) =>
    set({ userHp, monsterHp, currentQuestion: nextQuestion }),
  reset: () =>
    set({
      battleId: null,
      currentQuestion: null,
      monster: null,
      userHp: 0,
      userHpMax: 0,
      monsterHp: 0,
      monsterHpMax: 0,
      attempts: [],
      isSubmitting: false,
    }),
  setSubmitting: (v) => set({ isSubmitting: v }),
}));
