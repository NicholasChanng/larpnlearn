"use client";

import { create } from "zustand";

import type { QuizQuestionMetadata } from "@/lib/types";

export const DAMAGE_PER_ANSWER = 10;

export type BattlePhase =
  | "idle"
  | "loading"
  | "asking"
  | "validating"
  | "feedback"
  | "won"
  | "lost";

interface BattleState {
  phase: BattlePhase;
  questions: QuizQuestionMetadata[];
  currentIndex: number;
  userHp: number;
  userHpMax: number;
  monsterHp: number;
  monsterHpMax: number;
  feedback: string | null;
  lastCorrect: boolean | null;
  lastDamageDealt: number;
  lastDamageTaken: number;
  transcript: string | null;

  setLoading: () => void;
  setup: (args: {
    questions: QuizQuestionMetadata[];
    userHp: number;
    monsterHp: number;
  }) => void;
  setSubmitting: () => void;
  applyValidation: (args: {
    correct: boolean;
    feedback: string;
    transcript?: string | null;
  }) => void;
  advance: () => void;
  reset: () => void;
}

const INITIAL: Pick<
  BattleState,
  | "phase"
  | "questions"
  | "currentIndex"
  | "userHp"
  | "userHpMax"
  | "monsterHp"
  | "monsterHpMax"
  | "feedback"
  | "lastCorrect"
  | "lastDamageDealt"
  | "lastDamageTaken"
  | "transcript"
> = {
  phase: "idle",
  questions: [],
  currentIndex: 0,
  userHp: 0,
  userHpMax: 0,
  monsterHp: 0,
  monsterHpMax: 0,
  feedback: null,
  lastCorrect: null,
  lastDamageDealt: 0,
  lastDamageTaken: 0,
  transcript: null,
};

export const useBattleStore = create<BattleState>((set, get) => ({
  ...INITIAL,

  setLoading: () => set({ ...INITIAL, phase: "loading" }),

  setup: ({ questions, userHp, monsterHp }) =>
    set({
      ...INITIAL,
      phase: questions.length === 0 ? "lost" : "asking",
      questions,
      currentIndex: 0,
      userHp,
      userHpMax: userHp,
      monsterHp,
      monsterHpMax: monsterHp,
    }),

  setSubmitting: () => set({ phase: "validating" }),

  applyValidation: ({ correct, feedback, transcript }) => {
    const state = get();
    const damageDealt = correct ? DAMAGE_PER_ANSWER : 0;
    const damageTaken = correct ? 0 : DAMAGE_PER_ANSWER;
    const nextMonsterHp = Math.max(0, state.monsterHp - damageDealt);
    const nextUserHp = Math.max(0, state.userHp - damageTaken);

    let phase: BattlePhase = "feedback";
    if (nextMonsterHp <= 0) phase = "won";
    else if (nextUserHp <= 0) phase = "lost";

    set({
      phase,
      userHp: nextUserHp,
      monsterHp: nextMonsterHp,
      feedback,
      transcript: transcript ?? null,
      lastCorrect: correct,
      lastDamageDealt: damageDealt,
      lastDamageTaken: damageTaken,
    });
  },

  advance: () => {
    const state = get();
    if (state.phase !== "feedback") return;
    const nextIndex = state.currentIndex + 1;
    if (nextIndex >= state.questions.length) {
      // Ran out of questions with both alive: treat as user win if user still
      // has more HP proportionally, otherwise loss. Simpler: user wins if
      // alive, since they outlasted the question bank.
      set({ phase: state.userHp > 0 ? "won" : "lost" });
      return;
    }
    set({
      phase: "asking",
      currentIndex: nextIndex,
      feedback: null,
      lastCorrect: null,
      lastDamageDealt: 0,
      lastDamageTaken: 0,
      transcript: null,
    });
  },

  reset: () => set({ ...INITIAL }),
}));

export function currentQuestion(state: BattleState): QuizQuestionMetadata | null {
  return state.questions[state.currentIndex] ?? null;
}
