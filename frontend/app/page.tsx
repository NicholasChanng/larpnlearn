"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { CloudTransition } from "@/components/world/CloudTransition";

export default function Home() {
  const router = useRouter();
  const [cloudTrigger, setCloudTrigger] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const handleClick = useCallback(() => {
    if (transitioning) return;
    setTransitioning(true);
    setCloudTrigger((c) => c + 1);
  }, [transitioning]);

  const handleMidpoint = useCallback(() => {
    router.push("/world");
  }, [router]);

  return (
    <div
      className="relative flex h-screen w-full cursor-pointer items-center justify-center overflow-hidden bg-black"
      onClick={handleClick}
    >
      {/* Olympus backdrop */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/themes/greek/background/world/mountolympus.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        style={{ opacity: 0.85, imageRendering: "pixelated" }}
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/30" />

      {/* Centered content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-4 text-center"
      >
        <h1
          className="font-pixel text-6xl font-bold tracking-widest text-yellow-300 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] md:text-7xl"
          style={{
            textShadow: "0 0 20px #fde047, 3px 3px 0 #92400e",
          }}
        >
          Larp N Learn
        </h1>

        <p className="font-pixel text-sm uppercase tracking-widest text-yellow-100/80 md:text-base">
          Now demo with Berkeley&apos;s CS 188
        </p>

        <motion.p
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }}
          className="mt-6 font-pixel text-xs uppercase tracking-widest text-white/60"
        >
          ▶ Click anywhere to start
        </motion.p>
      </motion.div>

      <CloudTransition trigger={cloudTrigger} onMidpoint={handleMidpoint} />
    </div>
  );
}
