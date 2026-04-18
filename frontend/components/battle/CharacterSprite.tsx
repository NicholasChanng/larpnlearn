"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

type TriggerKind = "idle" | "attack" | "hit" | "faint" | "victory";

interface Props {
  emoji: string;
  facing: "left" | "right";
  size?: "sm" | "md" | "lg" | "boss";
  trigger: TriggerKind;
  damageEffect?: string; // applied overlay style when hit
  label?: string;
}

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-6xl",
  md: "text-7xl",
  lg: "text-8xl",
  boss: "text-9xl",
};

/**
 * Pixelated character sprite with idle bob + triggered animations.
 *
 * Emoji-based placeholder for now. When Track-6 lands real sprite sheets,
 * swap the <span>emoji</span> for <Image src={spritePath} /> plus a
 * CSS steps() animation sheet — the trigger prop already covers the
 * four canonical states.
 */
export function CharacterSprite({
  emoji,
  facing,
  size = "md",
  trigger,
  damageEffect,
  label,
}: Props) {
  const controls = useAnimation();

  useEffect(() => {
    const run = async () => {
      switch (trigger) {
        case "attack": {
          const dir = facing === "right" ? 1 : -1;
          await controls.start({
            x: [0, 30 * dir, -10 * dir, 0],
            scale: [1, 1.1, 0.95, 1],
            transition: { duration: 0.45 },
          });
          break;
        }
        case "hit": {
          await controls.start({
            x: [0, -12, 12, -8, 0],
            filter: [
              "brightness(1) sepia(0)",
              "brightness(0.4) sepia(1) hue-rotate(-50deg)",
              "brightness(1) sepia(0)",
            ],
            transition: { duration: 0.5 },
          });
          break;
        }
        case "faint": {
          await controls.start({
            rotate: [0, -30, -90],
            opacity: [1, 0.6, 0.2],
            y: [0, 10, 30],
            transition: { duration: 0.9 },
          });
          break;
        }
        case "victory": {
          await controls.start({
            y: [0, -20, 0, -10, 0],
            rotate: [0, -5, 5, -5, 0],
            transition: { duration: 0.8, repeat: Infinity, repeatDelay: 0.3 },
          });
          break;
        }
        default: {
          controls.start({
            y: [0, -4, 0],
            transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
          });
        }
      }
    };
    run();
  }, [trigger, controls, facing]);

  return (
    <div className="relative flex flex-col items-center">
      <motion.span
        animate={controls}
        className={cn(
          "select-none drop-shadow-[0_6px_0_rgba(0,0,0,0.6)]",
          SIZE_CLASS[size],
          facing === "right" && "scale-x-[-1]",
        )}
        style={{
          imageRendering: "pixelated",
          filter: trigger === "faint" ? "grayscale(1) brightness(0.5)" : undefined,
        }}
      >
        {emoji}
      </motion.span>
      {damageEffect && trigger === "hit" && (
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 1.8] }}
          transition={{ duration: 0.7 }}
        >
          {damageEmoji(damageEffect)}
        </motion.div>
      )}
      {label && (
        <div className="mt-2 font-pixel text-xs font-bold uppercase tracking-widest text-white/90 drop-shadow">
          {label}
        </div>
      )}
    </div>
  );
}

function damageEmoji(effect: string): string {
  // Map monster damage_effect strings to an overlay glyph.
  // Fallback to a generic impact star.
  const map: Record<string, string> = {
    hellfire_incineration: "🔥",
    burn: "🔥",
    inferno: "🔥",
    ashes: "🔥",
    burn_bone: "🔥",
    petrification: "🗿",
    electrocution: "⚡",
    psychic_headache: "💫",
    confusion_daze: "💫",
    blinding_light: "✨",
    ghost_chill: "❄️",
    crushed: "💥",
    crushed_drowning: "💧",
    soul_drain: "🌀",
    venom_bite: "☠️",
    poisoned: "☠️",
    double_poison: "☠️",
    soaked: "💧",
    drenched_knockback: "💧",
    ink_blind: "🖤",
    bonk: "💥",
    gore: "💥",
    wound: "💥",
    bleeding_scratch: "🩸",
    talon_gash: "🩸",
    tooth_gash: "🩸",
    triple_bite_bleed: "🩸",
    spiny_puncture: "🩸",
    scratch: "💥",
    magic_burn: "✨",
    acidic_burn: "🧪",
    hammer_bruise: "🔨",
    bone_bruise: "🦴",
    rock_bruise: "🪨",
    buried_rubble: "🪨",
    feather_flurry: "🪶",
    gust_knockback: "💨",
    shell_knockback: "💥",
    shell_thud: "💥",
    peck_bleed: "🩸",
    webbed: "🕸️",
    explosion: "💥",
    beam_scorch: "🔥",
    hypnosis_daze: "💤",
  };
  return map[effect] ?? "💥";
}
