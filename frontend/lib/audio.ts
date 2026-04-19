/**
 * Howler.js audio manager.
 *
 * Graceful: if a sound file is missing (we don't have real audio assets yet),
 * the manager silently swallows the 404 and never throws. This means the UI
 * can call playSfx() freely during development and it just no-ops until
 * Track-6 drops real audio into public/themes/*.
 *
 * Usage:
 *   audio.playBgm("/themes/greek/music/olympus.mp3");
 *   audio.playSfx("/themes/greek/sfx/slash.mp3");
 *   audio.setMuted(true);
 *   audio.setVolume(0.5);
 */

"use client";

import { Howl, Howler } from "howler";

type Loaded = { howl: Howl; isBgm: boolean };

class AudioManager {
  private cache = new Map<string, Loaded>();
  private currentBgm: Howl | null = null;
  private currentBgmSrc: string | null = null;
  private muted = false;
  private volume = 0.6;

  init() {
    Howler.volume(this.volume);
  }

  private load(src: string, isBgm: boolean): Howl | null {
    const cached = this.cache.get(src);
    if (cached) return cached.howl;
    try {
      const howl = new Howl({
        src: [src],
        loop: isBgm,
        volume: isBgm ? 0.35 : 0.8,
        html5: isBgm,
        preload: true,
        onloaderror: () => {
          // Asset missing — noop.
        },
        onplayerror: () => {
          // Autoplay blocked or decode error — noop.
        },
      });
      this.cache.set(src, { howl, isBgm });
      return howl;
    } catch {
      return null;
    }
  }

  playBgm(src: string) {
    if (this.muted) {
      this.currentBgmSrc = src;
      return;
    }
    if (this.currentBgmSrc === src && this.currentBgm?.playing()) return;
    if (this.currentBgm) {
      this.currentBgm.fade(this.currentBgm.volume(), 0, 400);
      const old = this.currentBgm;
      setTimeout(() => old.stop(), 420);
    }
    const howl = this.load(src, true);
    if (!howl) return;
    this.currentBgm = howl;
    this.currentBgmSrc = src;
    howl.loop(true);
    howl.volume(0);
    try {
      howl.play();
      howl.fade(0, 0.35, 600);
    } catch {
      // ignore
    }
  }

  stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm = null;
      this.currentBgmSrc = null;
    }
  }

  playSfx(src: string | null | undefined) {
    if (!src || this.muted) return;
    const howl = this.load(src, false);
    if (!howl) return;
    try {
      howl.play();
    } catch {
      // ignore
    }
  }

  setMuted(v: boolean) {
    this.muted = v;
    Howler.mute(v);
    if (!v && this.currentBgmSrc && !this.currentBgm?.playing()) {
      this.playBgm(this.currentBgmSrc);
    }
  }

  isMuted() {
    return this.muted;
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    Howler.volume(this.volume);
  }

  getVolume() {
    return this.volume;
  }
}

export const audio = new AudioManager();
