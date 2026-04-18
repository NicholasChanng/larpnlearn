"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { CharacterSprite } from "./CharacterSprite";
import { DamageNumbers, type DamagePop } from "./DamageNumber";
import { HpBar } from "./HpBar";
import { MicButton } from "./MicButton";
import { SpeechBubble } from "./SpeechBubble";
import { Button } from "@/components/ui/button";
import { audio } from "@/lib/audio";
import { monsterForLevel, segmentForLevel } from "@/lib/useTheme";
import type {
  AnswerResponse,
  Level,
  Question,
  ThemeManifest,
  ThemeMonster,
} from "@/lib/types";

type SpriteTrigger = "idle" | "attack" | "hit" | "faint" | "victory";

interface BattleSceneProps {
  level: Level;
  manifest: ThemeManifest;
  question: Question;
  userHp: number;
  userHpMax: number;
  monsterHp: number;
  monsterHpMax: number;
  onSubmit: (answer: string) => Promise<AnswerResponse | null>;
  isSubmitting: boolean;
  lastResult: AnswerResponse | null;
  battleOver: boolean;
  onExit: () => void;
}

export function BattleScene({
  level,
  manifest,
  question,
  userHp,
  userHpMax,
  monsterHp,
  monsterHpMax,
  onSubmit,
  isSubmitting,
  lastResult,
  battleOver,
  onExit,
}: BattleSceneProps) {
  const [answer, setAnswer] = useState("");
  const [userTrigger, setUserTrigger] = useState<SpriteTrigger>("idle");
  const [monsterTrigger, setMonsterTrigger] = useState<SpriteTrigger>("idle");
  const [pops, setPops] = useState<DamagePop[]>([]);
  const popId = useRef(0);

  const segment = segmentForLevel(manifest, level.order_index);
  const monster: ThemeMonster | null = monsterForLevel(manifest, level.order_index, level.is_exam);
  const avatar = manifest.avatars[0] ?? null;

  useEffect(() => {
    if (segment) audio.playBgm(segment.music);
  }, [segment]);

  useEffect(() => {
    if (!lastResult) return;
    // trigger animations based on the most recent answer
    if (lastResult.is_correct) {
      setUserTrigger("attack");
      audio.playSfx(avatar?.attack_sound);
      setTimeout(() => {
        setMonsterTrigger("hit");
        audio.playSfx(manifest.correct_sfx);
        pushPop(lastResult.damage_dealt, "monster", "red");
      }, 250);
      setTimeout(() => setUserTrigger("idle"), 700);
      setTimeout(() => setMonsterTrigger("idle"), 1000);
    } else {
      setMonsterTrigger("attack");
      audio.playSfx(monster?.attack_sound);
      audio.playSfx(manifest.wrong_sfx);
      setTimeout(() => {
        setUserTrigger("hit");
        pushPop(lastResult.damage_taken, "user", "red");
      }, 250);
      setTimeout(() => setMonsterTrigger("idle"), 700);
      setTimeout(() => setUserTrigger("idle"), 1000);
    }
  }, [lastResult, avatar?.attack_sound, manifest.correct_sfx, manifest.wrong_sfx, monster?.attack_sound]);

  useEffect(() => {
    if (!battleOver || !lastResult) return;
    if (lastResult.battle_outcome === "win") {
      setUserTrigger("victory");
      setMonsterTrigger("faint");
      audio.playSfx(manifest.victory_sfx);
    } else if (lastResult.battle_outcome === "lose") {
      setUserTrigger("faint");
      setMonsterTrigger("victory");
      audio.playSfx(manifest.defeat_sfx);
    }
  }, [battleOver, lastResult, manifest.victory_sfx, manifest.defeat_sfx]);

  const pushPop = useCallback((value: number, side: "user" | "monster", color: "red" | "green") => {
    const id = ++popId.current;
    setPops((prev) => [...prev, { id, value, side, color }]);
    setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== id)), 800);
  }, []);

  async function handleSubmit() {
    if (!answer || isSubmitting) return;
    await onSubmit(answer);
    setAnswer("");
  }

  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden"
      style={{
        background: segment?.bg_gradient ?? "linear-gradient(180deg, #0f172a, #000000)",
      }}
    >
      {/* Pixel ground strip */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Exit */}
      <div className="absolute right-4 top-4 z-20">
        <Button size="sm" variant="ghost" onClick={onExit} className="text-white/70 hover:text-white">
          Flee
        </Button>
      </div>

      {/* Combat area */}
      <div className="relative flex flex-1 items-end justify-between px-10 pb-24 pt-10">
        <DamageNumbers pops={pops} />

        {/* Player */}
        <div className="z-10 flex flex-col items-start gap-3">
          <HpBar label={avatar?.name ?? "You"} hp={userHp} max={userHpMax} />
          <CharacterSprite
            emoji={avatar?.emoji ?? "🧍"}
            facing="right"
            size="lg"
            trigger={userTrigger}
            label={avatar?.name}
          />
        </div>

        {/* Monster + question */}
        <div className="z-10 flex flex-col items-end gap-3">
          <HpBar label={monster?.name ?? "?"} hp={monsterHp} max={monsterHpMax} align="right" />
          <div className="mb-2">
            <SpeechBubble text={question.prompt} from="right" />
          </div>
          <CharacterSprite
            emoji={monster?.emoji ?? "👾"}
            facing="left"
            size={level.is_exam ? "boss" : "lg"}
            trigger={monsterTrigger}
            damageEffect={monster?.damage_effect}
            label={monster?.name}
          />
        </div>
      </div>

      {/* Answer input tray */}
      <div className="relative z-20 border-t-4 border-black bg-slate-950/90 p-4 backdrop-blur">
        {question.type === "mcq" && question.options ? (
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
            {question.options.map((opt) => (
              <Button
                key={opt}
                variant={answer === opt ? "default" : "outline"}
                onClick={() => setAnswer(opt)}
                className="h-auto justify-start whitespace-normal py-3 text-left font-pixel"
              >
                {opt}
              </Button>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-2">
            <textarea
              className="w-full rounded-md border border-border bg-black/60 p-3 font-mono text-sm text-white"
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={
                question.type === "pseudocode"
                  ? "Write your pseudocode…"
                  : question.type === "math"
                    ? "Type your equation or final answer…"
                    : "Type your answer…"
              }
            />
            {question.type === "spoken" && (
              <div className="flex gap-2">
                <MicButton onTranscript={(t) => setAnswer(t)} />
                <span className="self-center text-xs text-slate-400">
                  …or type it out.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mx-auto mt-3 flex max-w-3xl items-center justify-between">
          <div className="text-xs italic text-slate-400">
            {lastResult?.feedback ?? (question.rubric ? "Free-form — graded on rubric." : "")}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!answer || isSubmitting || battleOver}
            className="font-pixel text-sm"
          >
            {isSubmitting ? "Attacking…" : battleOver ? "Over" : "⚔ Attack"}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {battleOver && lastResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              className={`rounded-2xl border-4 px-10 py-8 text-center shadow-2xl ${
                lastResult.battle_outcome === "win"
                  ? "border-yellow-400 bg-gradient-to-b from-yellow-900 to-black"
                  : "border-red-500 bg-gradient-to-b from-red-950 to-black"
              }`}
            >
              <div className="font-pixel text-4xl text-white">
                {lastResult.battle_outcome === "win" ? "VICTORY!" : "DEFEAT"}
              </div>
              <div className="mt-3 max-w-md text-sm text-slate-300">{lastResult.feedback}</div>
              <Button onClick={onExit} className="mt-6">
                Return to the Map
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
