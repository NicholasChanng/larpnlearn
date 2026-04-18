"use client";

import { useEffect, useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AnswerResponse } from "@/lib/types";
import { useBattleStore } from "@/store/useBattleStore";

/**
 * Battle View (SRS 4.1.2, FR-BTL-01..12).
 *
 * Owner: Track-2 (Frontend-Battle). This stub shows the full happy path:
 * start -> render question -> submit -> update HP. Replace text UI with
 * sprite-based combat scene, HP bars, speech bubble, attack animations.
 */
export default function BattlePage({ params }: { params: { id: string } }) {
  const {
    battleId,
    currentQuestion,
    monster,
    userHp,
    userHpMax,
    monsterHp,
    monsterHpMax,
    setBattle,
    applyAnswer,
    isSubmitting,
    setSubmitting,
  } = useBattleStore();

  const [answer, setAnswer] = useState("");
  const [lastResult, setLastResult] = useState<AnswerResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await api.battles.start(params.id);
      if (cancelled) return;
      setBattle({
        battleId: r.battle_id,
        question: r.initial_question,
        monster: r.monster,
        userHp: r.user_hp,
        monsterHp: r.monster_hp,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, setBattle]);

  async function onSubmit() {
    if (!battleId || !currentQuestion) return;
    setSubmitting(true);
    try {
      const r = await api.battles.answer(battleId, {
        question_id: currentQuestion.id,
        answer,
      });
      setLastResult(r);
      applyAnswer({
        userHp: r.user_hp,
        monsterHp: r.monster_hp,
        nextQuestion: r.next_question,
      });
      setAnswer("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-black">
      <TopBar />
      <section className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-bold">
          Battle — {monster?.name ?? "Loading…"}
        </h1>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <HpBar label="You" hp={userHp} max={userHpMax} color="bg-green-500" />
          <HpBar label={monster?.name ?? "—"} hp={monsterHp} max={monsterHpMax} color="bg-red-500" />
        </div>

        {currentQuestion && (
          <div className="rounded-lg border border-border bg-background/60 p-6">
            <p className="mb-4 italic text-muted-foreground">
              &ldquo;{currentQuestion.prompt}&rdquo;
            </p>
            {currentQuestion.type === "mcq" && currentQuestion.options ? (
              <div className="grid gap-2">
                {currentQuestion.options.map((opt) => (
                  <Button
                    key={opt}
                    variant="outline"
                    onClick={() => setAnswer(opt)}
                    className={answer === opt ? "border-primary" : ""}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full rounded-md border border-border bg-background p-3 font-mono text-sm"
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            )}
            <Button onClick={onSubmit} disabled={!answer || isSubmitting} className="mt-4">
              {isSubmitting ? "Attacking…" : "Attack"}
            </Button>
          </div>
        )}

        {lastResult && (
          <div className="mt-6 rounded-md border border-border bg-background/40 p-4 text-sm">
            <div className="font-semibold">
              {lastResult.is_correct ? "✅ Hit!" : "❌ Miss."}
            </div>
            <div className="text-muted-foreground">{lastResult.feedback}</div>
          </div>
        )}
      </section>
    </main>
  );
}

function HpBar({ label, hp, max, color }: { label: string; hp: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span>
          {hp} / {max}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
