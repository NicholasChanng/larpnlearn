"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BattleScene } from "@/components/battle/BattleScene";
import { api } from "@/lib/api";
import {
  quizToQuestion,
  type Level,
  type LevelDetailResponse,
  type QuizQuestionMetadata,
  type WorldResponse,
} from "@/lib/types";
import { useThemeManifest } from "@/lib/useTheme";
import { useBattleStore, currentQuestion } from "@/store/useBattleStore";
import { useThemeStore } from "@/store/useThemeStore";

const DEMO_COURSE_ID = "cs188-sp2024";
const DIFFICULTY = 5;

function getBattleHp(level: Level): { userHp: number; monsterHp: number } {
  if (level.is_exam) {
    if (level.exam_type === "final") return { userHp: 100, monsterHp: 500 };
    return { userHp: 50, monsterHp: 300 };
  }
  return { userHp: 30, monsterHp: 100 };
}

function computeNumQuestions(userHp: number, monsterHp: number): number {
  const raw = Math.floor((userHp + monsterHp - 10) / 10);
  return Math.max(1, Math.min(30, raw));
}

export default function BattlePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const store = useBattleStore();
  const setTheme = useThemeStore((s) => s.setTheme);
  const manifest = useThemeManifest();

  const [level, setLevel] = useState<Level | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      store.setLoading();
      try {
        const [levelDetail, world] = await Promise.all([
          api.world.level(params.id).catch(() => null) as Promise<LevelDetailResponse | null>,
          api.world.get(DEMO_COURSE_ID).catch(() => null) as Promise<WorldResponse | null>,
        ]);
        if (cancelled) return;
        if (!levelDetail) {
          setLoadError("Could not load level.");
          return;
        }
        setLevel(levelDetail.level);
        if (world) setTheme(world.theme);

        const { userHp, monsterHp } = getBattleHp(levelDetail.level);
        const numQuestions = computeNumQuestions(userHp, monsterHp);
        const lectureIds = [String(levelDetail.level.order_index)];

        const resp = await api.battles.generateQuestions({
          lecture_ids: lectureIds,
          num_of_questions: numQuestions,
          difficulty: DIFFICULTY,
        });
        if (cancelled) return;

        store.setup({
          questions: resp.question_data,
          userHp,
          monsterHp,
        });
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to start battle.",
        );
      }
    })();
    return () => {
      cancelled = true;
      store.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const active: QuizQuestionMetadata | null = currentQuestion(store);

  const handleSubmit = useCallback(
    async (answer: string, audioBlobB64?: string | null) => {
      if (!active || store.phase !== "asking") return;
      store.setSubmitting();
      console.log("[handleSubmit] submitting answer", {
        question_type: active.question_type,
        has_audio: !!audioBlobB64,
        audio_b64_length: audioBlobB64?.length ?? 0,
        user_response: answer || null,
      });
      try {
        console.log("[handleSubmit] calling validateAnswer...");
        const resp = await api.battles.validateAnswer({
          user_response: answer || null,
          audio_blob_b64: audioBlobB64 ?? null,
          question_metadata: active,
        });
        console.log("[handleSubmit] validateAnswer response:", resp);
        store.applyValidation({
          correct: resp.correct,
          feedback: resp.feedback,
          transcript: resp.transcript,
        });
      } catch (err) {
        console.error("[handleSubmit] validateAnswer error:", err);
        // surface failure as incorrect with error feedback so the loop continues
        store.applyValidation({
          correct: false,
          feedback:
            err instanceof Error
              ? `Validation failed: ${err.message}`
              : "Validation failed.",
        });
      }
    },
    [active, store],
  );

  const handleAdvance = useCallback(() => {
    store.advance();
  }, [store]);

  const handleExit = () => router.push("/world");

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-slate-300">
        <div>{loadError}</div>
        <button
          onClick={handleExit}
          className="rounded border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800"
        >
          Return to map
        </button>
      </div>
    );
  }

  if (
    !level ||
    !manifest ||
    store.phase === "idle" ||
    store.phase === "loading" ||
    !active
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-slate-400">
        Preparing battle…
      </div>
    );
  }

  const question = quizToQuestion(active);

  return (
    <BattleScene
      level={level}
      manifest={manifest}
      question={question}
      userHp={store.userHp}
      userHpMax={store.userHpMax}
      monsterHp={store.monsterHp}
      monsterHpMax={store.monsterHpMax}
      onSubmit={handleSubmit}
      onAdvance={handleAdvance}
      phase={store.phase}
      feedback={store.feedback}
      lastCorrect={store.lastCorrect}
      lastDamageDealt={store.lastDamageDealt}
      lastDamageTaken={store.lastDamageTaken}
      onExit={handleExit}
    />
  );
}
