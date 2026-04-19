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
import {
  avatarForCharacter,
  battleBgForLevel,
  monsterForLevel,
  segmentForLevel,
} from "@/lib/useTheme";
import type { Level, Question, ThemeManifest, ThemeMonster } from "@/lib/types";
import type { BattlePhase } from "@/store/useBattleStore";
import { useUserStore } from "@/store/useUserStore";

type SpriteTrigger = "idle" | "attack" | "hit" | "faint" | "victory";

interface BattleSceneProps {
  level: Level;
  manifest: ThemeManifest;
  question: Question;
  userHp: number;
  userHpMax: number;
  monsterHp: number;
  monsterHpMax: number;
  onSubmit: (answer: string, audioBlobB64?: string | null) => Promise<void> | void;
  onAdvance: () => void;
  phase: BattlePhase;
  feedback: string | null;
  lastCorrect: boolean | null;
  lastDamageDealt: number;
  lastDamageTaken: number;
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
  onAdvance,
  phase,
  feedback,
  lastCorrect,
  lastDamageDealt,
  lastDamageTaken,
  onExit,
}: BattleSceneProps) {
  const [answer, setAnswer] = useState("");
  const [audioBlobB64, setAudioBlobB64] = useState<string | null>(null);
  const [userTrigger, setUserTrigger] = useState<SpriteTrigger>("idle");
  const [monsterTrigger, setMonsterTrigger] = useState<SpriteTrigger>("idle");
  const [pops, setPops] = useState<DamagePop[]>([]);
  const popId = useRef(0);

  const segment = segmentForLevel(manifest, level.order_index);
  const monster: ThemeMonster | null = monsterForLevel(
    manifest,
    level.order_index,
    level.is_exam,
  );
  const avatarCharacter = useUserStore((s) => s.avatarCharacter);
  const avatar = avatarForCharacter(manifest, avatarCharacter);
  const battleBg = battleBgForLevel(manifest, level.order_index);

  const battleOver = phase === "won" || phase === "lost";
  const showFeedback = phase === "feedback" || battleOver;
  const isSubmitting = phase === "validating";

  const bubbleText = showFeedback && feedback ? feedback : question.prompt;

  useEffect(() => {
    if (segment) audio.playBgm(segment.music);
  }, [segment]);

  const pushPop = useCallback(
    (value: number, side: "user" | "monster", color: "red" | "green") => {
      const id = ++popId.current;
      setPops((prev) => [...prev, { id, value, side, color }]);
      setTimeout(() => setPops((prev) => prev.filter((p) => p.id !== id)), 800);
    },
    [],
  );

  // Trigger sprite / sfx animations when validation resolves (phase → feedback or end).
  useEffect(() => {
    if (phase !== "feedback" && phase !== "won" && phase !== "lost") return;
    if (lastCorrect === null) return;

    if (lastCorrect) {
      setUserTrigger("attack");
      audio.playSfx(avatar?.attack_sound);
      setTimeout(() => {
        setMonsterTrigger("hit");
        audio.playSfx(manifest.correct_sfx);
        pushPop(lastDamageDealt, "monster", "red");
      }, 250);
      setTimeout(() => setUserTrigger("idle"), 700);
      setTimeout(() => setMonsterTrigger("idle"), 1000);
    } else {
      setMonsterTrigger("attack");
      audio.playSfx(monster?.attack_sound);
      audio.playSfx(manifest.wrong_sfx);
      setTimeout(() => {
        setUserTrigger("hit");
        pushPop(lastDamageTaken, "user", "red");
      }, 250);
      setTimeout(() => setMonsterTrigger("idle"), 700);
      setTimeout(() => setUserTrigger("idle"), 1000);
    }
  }, [
    phase,
    lastCorrect,
    lastDamageDealt,
    lastDamageTaken,
    avatar?.attack_sound,
    manifest.correct_sfx,
    manifest.wrong_sfx,
    monster?.attack_sound,
    pushPop,
  ]);

  useEffect(() => {
    if (phase === "won") {
      setUserTrigger("victory");
      setMonsterTrigger("faint");
      audio.playSfx(manifest.victory_sfx);
    } else if (phase === "lost") {
      setUserTrigger("faint");
      setMonsterTrigger("victory");
      audio.playSfx(manifest.defeat_sfx);
    }
  }, [phase, manifest.victory_sfx, manifest.defeat_sfx]);

  // Reset answer input when a new question is presented.
  useEffect(() => {
    if (phase === "asking") {
      setAnswer("");
      setAudioBlobB64(null);
    }
  }, [phase, question.id]);

  async function handleSubmit() {
    if (isSubmitting) return;
    if (!answer && !audioBlobB64) return;
    await onSubmit(answer, audioBlobB64);
  }

  const handleClickToContinue = () => {
    if (phase === "feedback") onAdvance();
  };

  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden bg-black"
      onClick={phase === "feedback" ? handleClickToContinue : undefined}
    >
      {battleBg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={battleBg}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
          style={{ opacity: 0.8, imageRendering: "pixelated" }}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      <div className="absolute left-4 top-4 z-20 w-[min(448px,calc(50vw-1rem))]">
        <HpBar label={avatar?.name ?? "You"} hp={userHp} max={userHpMax} />
      </div>
      <div className="absolute right-4 top-4 z-20 w-[min(448px,calc(50vw-1rem))]">
        <HpBar
          label={monster?.name ?? "?"}
          hp={monsterHp}
          max={monsterHpMax}
          align="right"
        />
      </div>

      <div className="absolute right-4 top-28 z-20">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onExit();
          }}
          className="text-white/70 hover:text-white"
        >
          Flee
        </Button>
      </div>

      <div className="relative flex flex-1 items-end justify-between px-10 pb-10 pt-10">
        <DamageNumbers pops={pops} />

        <div
          className="z-10 flex max-w-xl flex-col items-start gap-3"
          style={{ transform: "translate(200px, -120px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 w-full">
            <AnswerBubble
              question={question}
              answer={answer}
              setAnswer={setAnswer}
              onAudio={setAudioBlobB64}
              hasAudio={!!audioBlobB64}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              disabled={phase !== "asking"}
            />
          </div>
          <CharacterSprite
            emoji={avatar?.emoji ?? "🧍"}
            spriteSrc={avatar?.sprite}
            facing="right"
            size="lg"
            trigger={userTrigger}
            label={avatar?.name}
          />
        </div>

        <div
          className="z-10 flex flex-col items-end gap-3"
          style={{ transform: "translate(-200px, -120px)" }}
        >
          <div className="mb-2">
            <SpeechBubble text={bubbleText} from="right" />
          </div>
          <CharacterSprite
            emoji={monster?.emoji ?? "👾"}
            spriteSrc={monster?.sprite_path}
            facing="left"
            size={level.is_exam ? "boss" : "lg"}
            trigger={monsterTrigger}
            damageEffect={monster?.damage_effect}
            label={monster?.name}
          />
        </div>
      </div>

      {/* Click-anywhere-to-continue hint (only between question and next question) */}
      <AnimatePresence>
        {phase === "feedback" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center"
          >
            <div className="rounded-full border border-white/20 bg-black/70 px-4 py-2 font-pixel text-xs uppercase tracking-widest text-white/80 shadow-lg backdrop-blur">
              ▶ Click anywhere to continue
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {battleOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              className={`rounded-2xl border-4 px-10 py-8 text-center shadow-2xl ${
                phase === "won"
                  ? "border-yellow-400 bg-gradient-to-b from-yellow-900 to-black"
                  : "border-red-500 bg-gradient-to-b from-red-950 to-black"
              }`}
            >
              <div className="font-pixel text-4xl text-white">
                {phase === "won" ? "VICTORY!" : "DEFEAT"}
              </div>
              <div className="mt-3 max-w-md text-sm text-slate-300">
                {feedback}
              </div>
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

interface AnswerBubbleProps {
  question: Question;
  answer: string;
  setAnswer: (a: string) => void;
  onAudio: (b64: string | null) => void;
  hasAudio: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  disabled: boolean;
}

function AnswerBubble({
  question,
  answer,
  setAnswer,
  onAudio,
  hasAudio,
  onSubmit,
  isSubmitting,
  disabled,
}: AnswerBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative ml-6 rounded-2xl border-4 border-black bg-white px-5 py-4 text-slate-900 shadow-2xl"
    >
      {question.type === "mcq" && question.options ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {question.options.map((opt) => (
            <Button
              key={opt}
              variant={answer === opt ? "default" : "outline"}
              onClick={() => setAnswer(opt)}
              disabled={disabled}
              className="h-auto justify-start whitespace-normal py-2 text-left font-pixel text-xs"
            >
              {opt}
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md border border-slate-300 bg-slate-50 p-2 font-mono text-sm text-slate-900"
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer…"
          />
          {question.type === "spoken" && (
            <div className="flex gap-2">
              <MicButton
                onAudio={(b64) => onAudio(b64)}
                onTranscript={(t) => setAnswer(t)}
              />
              <span className="self-center text-xs text-slate-500">
                {hasAudio ? "Audio ready — Attack to send." : "…or type it out."}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs italic text-slate-500">
          {question.rubric ? "Free-form — graded on rubric." : ""}
        </div>
        <Button
          onClick={onSubmit}
          disabled={(!answer && !hasAudio) || isSubmitting || disabled}
          className="font-pixel text-sm"
        >
          {isSubmitting ? "Attacking…" : "⚔ Attack"}
        </Button>
      </div>

      <div className="absolute top-full left-8 h-0 w-0 border-x-[18px] border-t-[22px] border-x-transparent border-t-black" />
      <div
        className="absolute top-full left-11 h-0 w-0 border-x-[12px] border-t-[16px] border-x-transparent border-t-white"
        style={{ transform: "translateY(-3px)" }}
      />
    </motion.div>
  );
}
