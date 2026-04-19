"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CloudTransition } from "./CloudTransition";
import { LevelNode } from "./LevelNode";
import { SegmentBanner } from "./SegmentBanner";
import { audio } from "@/lib/audio";
import { avatarForCharacter, monsterForLevel, segmentForLevel } from "@/lib/useTheme";
import { cn } from "@/lib/utils";
import type { Level, ThemeManifest, ThemeSegment } from "@/lib/types";
import { useUserStore } from "@/store/useUserStore";

interface WorldMapProps {
  levels: Level[];
  manifest: ThemeManifest;
  currentLevelId: string | null;
}

/**
 * Page-snap world map.
 *
 * Each region (theme segment) takes the full viewport. Navigation is
 * discrete: ArrowLeft/ArrowRight or a horizontal/vertical wheel/trackpad
 * gesture moves to the previous/next region. The shell exposes a single
 * `segmentIndex` so a transition animation can be wrapped around the
 * panel render in a follow-up PR (e.g. AnimatePresence + slide).
 *
 * The active region also drives the looping background music.
 */
export function WorldMap({ levels, manifest, currentLevelId }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);

  const avatarCharacter = useUserStore((s) => s.avatarCharacter);
  const avatar = avatarForCharacter(manifest, avatarCharacter);
  const avatarEmoji = avatar?.emoji ?? "🧍";
  const avatarSprite = avatar?.sprite ?? null;

  const grouped = useMemo(() => groupLevelsBySegment(levels, manifest), [levels, manifest]);

  const initialIndex = useMemo(() => {
    const current = levels.find((l) => l.id === currentLevelId);
    if (!current) return 0;
    const seg = segmentForLevel(manifest, current.order_index);
    if (!seg) return 0;
    const idx = grouped.findIndex((g) => g.segment.id === seg.id);
    return idx >= 0 ? idx : 0;
  }, [levels, currentLevelId, manifest, grouped]);

  const [segmentIndex, setSegmentIndex] = useState(initialIndex);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [cloudTrigger, setCloudTrigger] = useState(0);
  const isTransitioning = pendingIndex !== null;

  // Re-anchor when the underlying current level changes (e.g. after a battle).
  useEffect(() => {
    setSegmentIndex(initialIndex);
  }, [initialIndex]);

  const goTo = useCallback(
    (next: number) => {
      if (isTransitioning) return;
      const clamped = Math.max(0, Math.min(grouped.length - 1, next));
      if (clamped === segmentIndex) return;
      setPendingIndex(clamped);
      setCloudTrigger((c) => c + 1);
    },
    [grouped.length, isTransitioning, segmentIndex],
  );

  const goPrev = useCallback(() => goTo(segmentIndex - 1), [goTo, segmentIndex]);
  const goNext = useCallback(() => goTo(segmentIndex + 1), [goTo, segmentIndex]);

  // Mid-transition: clouds fully cover the screen → swap the visible region.
  const handleCloudsMidpoint = useCallback(() => {
    if (pendingIndex !== null) setSegmentIndex(pendingIndex);
  }, [pendingIndex]);

  // Transition done: clear the pending index so navigation re-enables.
  const handleCloudsComplete = useCallback(() => {
    setPendingIndex(null);
  }, []);

  // Keyboard: ←/→ change region.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // Wheel / trackpad: one region per gesture, debounced.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      const dx = e.deltaX;
      const dy = e.deltaY;
      const dominant = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(dominant) < 8) return;
      if (wheelLockRef.current) return;
      wheelLockRef.current = true;
      setTimeout(() => {
        wheelLockRef.current = false;
      }, 600);
      if (dominant > 0) goNext();
      else goPrev();
    }
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goNext, goPrev]);

  // Music: follow the active region.
  const activeSegment = grouped[segmentIndex]?.segment ?? null;
  useEffect(() => {
    if (activeSegment) audio.playBgm(activeSegment.music);
  }, [activeSegment]);

  if (grouped.length === 0) return null;
  const active = grouped[segmentIndex];
  const { segment, items } = active;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative h-screen w-full overflow-hidden focus:outline-none"
    >
      {/* Single-region panel. Wrap this in AnimatePresence later for transitions. */}
      <div key={segment.id} className="absolute inset-0">
        {segment.bg_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={segment.bg_image}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
            style={{ imageRendering: "pixelated", opacity: 0.8 }}
          />
        )}
        {!segment.bg_image && (
          <div
            className="absolute inset-0"
            style={{ background: segment.bg_gradient }}
          />
        )}

        <SegmentBanner segment={segment} />

        <div className="absolute inset-0 flex items-center">
          <div className="flex flex-1 items-end justify-around gap-10 px-6 pb-20 pt-40">
            {items.map((level, i) => {
              const monster = monsterForLevel(manifest, level.order_index, level.is_exam);
              const isCurrent = level.id === currentLevelId;
              return (
                <div
                  key={level.id}
                  style={{ transform: `translateY(${trophyYOffset(i, level.is_exam)}px)` }}
                >
                  <LevelNode
                    level={level}
                    monster={monster}
                    isCurrent={isCurrent}
                    avatarEmoji={avatarEmoji}
                    avatarSprite={avatarSprite}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subtle vignette overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Region pagination dots */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {grouped.map((g, i) => (
          <span
            key={g.segment.id}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              i === segmentIndex
                ? "w-6 bg-yellow-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]"
                : "bg-white/30",
            )}
          />
        ))}
      </div>

      {/* Prev / next nav */}
      <NavArrow side="left" disabled={segmentIndex === 0} onClick={goPrev} />
      <NavArrow side="right" disabled={segmentIndex === grouped.length - 1} onClick={goNext} />

      <CloudTransition
        trigger={cloudTrigger}
        onMidpoint={handleCloudsMidpoint}
        onComplete={handleCloudsComplete}
      />
    </div>
  );
}

function NavArrow({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous region" : "Next region"}
      className={cn(
        "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-yellow-400/50 bg-black/50 p-3 text-yellow-100 backdrop-blur transition",
        side === "left" ? "left-4" : "right-4",
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:scale-110 hover:border-yellow-300 hover:bg-black/70",
      )}
    >
      <Icon size={28} />
    </button>
  );
}

function trophyYOffset(i: number, isExam: boolean): number {
  if (isExam) return -20;
  // Gentle zigzag to suggest a path without an SVG curve
  return (i % 4) * -14 + (i % 2 === 0 ? 0 : 10);
}

function groupLevelsBySegment(
  levels: Level[],
  manifest: ThemeManifest,
): { segment: ThemeSegment; items: Level[] }[] {
  const byId = new Map<string, Level[]>();
  for (const l of levels) {
    const seg = segmentForLevel(manifest, l.order_index);
    if (!seg) continue;
    if (!byId.has(seg.id)) byId.set(seg.id, []);
    byId.get(seg.id)!.push(l);
  }
  return manifest.segments
    .map((segment) => ({ segment, items: byId.get(segment.id) ?? [] }))
    .filter((g) => g.items.length > 0);
}
