"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BattleScene } from "@/components/battle/BattleScene";
import { api } from "@/lib/api";
import type { AnswerResponse, Level, LevelDetailResponse, Question, WorldResponse } from "@/lib/types";
import { useThemeManifest } from "@/lib/useTheme";
import { useBattleStore } from "@/store/useBattleStore";
import { useThemeStore } from "@/store/useThemeStore";

const DEMO_COURSE_ID = "cs188-sp2024";

export default function BattlePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const {
    battleId,
    currentQuestion,
    userHp,
    userHpMax,
    monsterHp,
    monsterHpMax,
    isSubmitting,
    setBattle,
    applyAnswer,
    setSubmitting,
    reset,
  } = useBattleStore();

  const [level, setLevel] = useState<Level | null>(null);
  const [lastResult, setLastResult] = useState<AnswerResponse | null>(null);
  const [battleOver, setBattleOver] = useState(false);
  const setTheme = useThemeStore((s) => s.setTheme);
  const manifest = useThemeManifest();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [levelDetail, startResp, world] = await Promise.all([
        api.world.level(params.id).catch(() => null) as Promise<LevelDetailResponse | null>,
        api.battles.start(params.id),
        api.world.get(DEMO_COURSE_ID).catch(() => null) as Promise<WorldResponse | null>,
      ]);
      if (cancelled) return;
      if (levelDetail) setLevel(levelDetail.level);
      if (world) setTheme(world.theme);
      setBattle({
        battleId: startResp.battle_id,
        question: startResp.initial_question,
        monster: startResp.monster,
        userHp: startResp.user_hp,
        monsterHp: startResp.monster_hp,
      });
    })();
    return () => {
      cancelled = true;
      reset();
    };
  }, [params.id, setBattle, setTheme, reset]);

  const handleSubmit = useCallback(
    async (answer: string): Promise<AnswerResponse | null> => {
      if (!battleId || !currentQuestion) return null;
      setSubmitting(true);
      try {
        const r = await api.battles.answer(battleId, {
          question_id: currentQuestion.id,
          answer,
        });
        setLastResult(r);
        const outcome = r.battle_outcome;
        applyAnswer({
          userHp: r.user_hp,
          monsterHp: r.monster_hp,
          nextQuestion: outcome ? null : (r.next_question as Question | null),
        });
        if (outcome) setBattleOver(true);
        return r;
      } finally {
        setSubmitting(false);
      }
    },
    [battleId, currentQuestion, applyAnswer, setSubmitting],
  );

  const handleExit = () => router.push("/world");

  if (!level || !currentQuestion || !manifest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-slate-400">
        Preparing battle…
      </div>
    );
  }

  return (
    <BattleScene
      level={level}
      manifest={manifest}
      question={currentQuestion}
      userHp={userHp}
      userHpMax={userHpMax}
      monsterHp={monsterHp}
      monsterHpMax={monsterHpMax}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      lastResult={lastResult}
      battleOver={battleOver}
      onExit={handleExit}
    />
  );
}
