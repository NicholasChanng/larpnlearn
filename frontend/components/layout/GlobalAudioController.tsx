"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { audio } from "@/lib/audio";
import { useThemeManifest } from "@/lib/useTheme";
import { useAudioStore } from "@/store/useAudioStore";

/**
 * Ensures BGM is always available across pages and keeps mute state in sync.
 * - World and battle pages manage their own segment/level BGM.
 * - Other pages use the first segment's music as a global fallback.
 */
export function GlobalAudioController() {
  const pathname = usePathname();
  const manifest = useThemeManifest();
  const init = useAudioStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!manifest) return;
    if (pathname.startsWith("/world") || pathname.startsWith("/battle")) return;

    const fallbackMusic = manifest.segments[0]?.music;
    if (fallbackMusic) {
      audio.playBgm(fallbackMusic);
    }
  }, [manifest, pathname]);

  return null;
}
