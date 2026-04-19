"use client";

import Image from "next/image";
import Link from "next/link";

import { useAudioStore } from "@/store/useAudioStore";

/**
 * Persistent bottom-right nav: audio toggle, skills map, shop, home.
 * Mounted once in the root layout so it appears on every page. Cloud
 * transitions / loading overlays (z-50 full-screen) naturally cover it
 * while they're active, matching the "hidden during clouds" requirement.
 */
export function GlobalNav() {
  const { muted, toggleMute } = useAudioStore();
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <button
        onClick={toggleMute}
        aria-label="toggle audio"
        className="pointer-events-auto"
      >
        <Image
          src={muted ? "/assets/audioOffIcon.png" : "/assets/audioOnIcon.png"}
          alt={muted ? "Audio off" : "Audio on"}
          width={70}
          height={70}
          className="cursor-pointer transition-transform duration-200 hover:scale-125 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
        />
      </button>
      <div className="pointer-events-auto flex items-center gap-0">
        <Link href="/skills">
          <Image
            src="/assets/map_icon.png"
            alt="Skills"
            width={100}
            height={100}
            className="cursor-pointer transition-transform duration-200 hover:scale-125 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
          />
        </Link>
        <Link href="/shop">
          <Image
            src="/assets/shop_icon.png"
            alt="Shop"
            width={100}
            height={100}
            className="cursor-pointer transition-transform duration-200 hover:scale-125 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
          />
        </Link>
        <Link href="/">
          <Image
            src="/assets/home.png"
            alt="Home"
            width={100}
            height={100}
            className="cursor-pointer transition-transform duration-200 hover:scale-125 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
          />
        </Link>
      </div>
    </div>
  );
}
