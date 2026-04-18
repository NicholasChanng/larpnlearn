"use client";

import { useEffect, useMemo, useRef } from "react";

import { LevelNode } from "./LevelNode";
import { SegmentBanner } from "./SegmentBanner";
import { audio } from "@/lib/audio";
import { monsterForLevel, segmentForLevel } from "@/lib/useTheme";
import type { Level, ThemeManifest, ThemeSegment } from "@/lib/types";

interface WorldMapProps {
  levels: Level[];
  manifest: ThemeManifest;
  currentLevelId: string | null;
}

/**
 * Horizontal trophy-road world map.
 *
 * Layout: one long horizontal scroll. Each segment gets its own background
 * panel (drawn from the theme manifest's bg_gradient) with its level nodes
 * laid out across it. A faint SVG path threads all nodes together.
 *
 * Auto-starts the background music of whichever segment the current level
 * lives in.
 */
export function WorldMap({ levels, manifest, currentLevelId }: WorldMapProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  const avatarEmoji = manifest.avatars[0]?.emoji ?? "🧍";

  const grouped = useMemo(() => groupLevelsBySegment(levels, manifest), [levels, manifest]);

  useEffect(() => {
    const current = levels.find((l) => l.id === currentLevelId);
    if (!current) return;
    const segment = segmentForLevel(manifest, current.order_index);
    if (segment) {
      audio.playBgm(segment.music);
    }
    return () => {
      // Don't stop BGM on unmount — let it carry to the battle scene.
    };
  }, [currentLevelId, levels, manifest]);

  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentLevelId]);

  return (
    <div
      ref={scrollerRef}
      className="relative h-[calc(100vh-120px)] w-full overflow-x-auto overflow-y-hidden"
    >
      <div className="relative flex h-full min-w-max items-stretch">
        {grouped.map(({ segment, items }, segIdx) => (
          <div
            key={segment.id}
            className="relative flex h-full shrink-0 items-center"
            style={{
              background: segment.bg_gradient ?? "linear-gradient(180deg, #1e293b, #0f172a)",
              boxShadow: segIdx > 0 ? "inset 40px 0 60px -20px rgba(0,0,0,0.6)" : undefined,
            }}
          >
            <SegmentBanner segment={segment} />

            <div className="flex items-end gap-10 px-6 pb-20 pt-32">
              {items.map((level, i) => {
                const monster = monsterForLevel(manifest, level.order_index, level.is_exam);
                const isCurrent = level.id === currentLevelId;
                return (
                  <div
                    key={level.id}
                    ref={isCurrent ? currentRef : undefined}
                    style={{ transform: `translateY(${trophyYOffset(i, level.is_exam)}px)` }}
                  >
                    <LevelNode
                      level={level}
                      monster={monster}
                      isCurrent={isCurrent}
                      avatarEmoji={avatarEmoji}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Subtle vignette overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
    </div>
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
