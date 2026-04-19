"use client";

import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

interface Props {
  /**
   * Bumped each time a transition should start. Using a counter lets the
   * effect re-run for back-to-back transitions without remounting.
   */
  trigger: number;
  /** Called at the midpoint, when the clouds have fully covered the screen. */
  onMidpoint?: () => void;
  /** Called once the clouds have fully receded. */
  onComplete?: () => void;
}

const SLIDE_DURATION = 0.55;
const HOLD_MS = 200;
// Fast at the start, slow into the middle.
const EASE_IN_TO_CENTER: [number, number, number, number] = [0.22, 1, 0.36, 1];
// Slow off the middle, fast as it leaves the screen — reverse of above.
const EASE_OUT_FROM_CENTER: [number, number, number, number] = [0.64, 0, 0.78, 0];

/**
 * Two-cloud wipe used between world regions. The left and right halves of
 * `clouds.png` slide in from their respective edges, hold briefly while the
 * underlying scene swaps, then retreat back off-screen.
 */
export function CloudTransition({ trigger, onMidpoint, onComplete }: Props) {
  const left = useAnimation();
  const right = useAnimation();

  useEffect(() => {
    if (trigger === 0) return;
    let cancelled = false;

    async function run() {
      // Phase A: slide in (decelerating into center).
      await Promise.all([
        left.start({
          x: "0%",
          transition: { duration: SLIDE_DURATION, ease: EASE_IN_TO_CENTER },
        }),
        right.start({
          x: "0%",
          transition: { duration: SLIDE_DURATION, ease: EASE_IN_TO_CENTER },
        }),
      ]);
      if (cancelled) return;
      onMidpoint?.();

      // Hold while the scene under the clouds swaps.
      await new Promise((r) => setTimeout(r, HOLD_MS));
      if (cancelled) return;

      // Phase B: slide back out (accelerating off-screen).
      await Promise.all([
        left.start({
          x: "-100%",
          transition: { duration: SLIDE_DURATION, ease: EASE_OUT_FROM_CENTER },
        }),
        right.start({
          x: "100%",
          transition: { duration: SLIDE_DURATION, ease: EASE_OUT_FROM_CENTER },
        }),
      ]);
      if (cancelled) return;
      onComplete?.();
    }

    run();
    return () => {
      cancelled = true;
    };
    // onMidpoint/onComplete intentionally excluded — we only want to react to `trigger`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <motion.img
        src="/assets/clouds.png"
        alt=""
        aria-hidden
        draggable={false}
        initial={{ x: "-100%" }}
        animate={left}
        className="absolute inset-y-0 left-0 h-full w-auto max-w-[60%] select-none object-cover"
        style={{ imageRendering: "pixelated" }}
      />
      <motion.img
        src="/assets/clouds.png"
        alt=""
        aria-hidden
        draggable={false}
        initial={{ x: "100%" }}
        animate={right}
        className="absolute inset-y-0 right-0 h-full w-auto max-w-[60%] -scale-x-100 select-none object-cover"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
