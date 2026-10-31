"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../coming-up/hooks";

/** How long the roll takes, and how many numbers it flicks through on the way. */
const ROLL_MS = 650;
const STEPS = 14;

/** Fast at first, slowing as it lands (ease-out cubic). */
const easeOut = (p: number) => 1 - (1 - p) ** 3;

/**
 * A hero number that rolls like a slot machine: it flicks through numbers quickly, slows down and settles on the
 * real value in about 0.65s, then gives a small pop and a green flash. Driven by the screen's frame clock
 * (requestAnimationFrame), so it stays smooth. Visible even when the value is 2. Changing `runKey` rolls it
 * again (e.g. when a tab changes). Reduced motion: the value shows straight away.
 */
export function RollingNumber({ value, seed = 1, runKey, className = "" }: { value: number; seed?: number; runKey?: string | number; className?: string }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState<{ step: number; blur: number } | null>({ step: 0, blur: 1 });
  const frame = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    // Each step only re-renders when the shown number actually changes, and slows down as it nears the end.
    let lastStep = -1;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ROLL_MS);
      if (p >= 1) {
        setState(null);
        return;
      }
      const eased = easeOut(p);
      const step = Math.floor(eased * STEPS);
      if (step !== lastStep) {
        lastStep = step;
        setState({ step, blur: 1 - eased });
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [reduce, runKey, value]);

  const rolling = !reduce && state !== null;
  const range = Math.max(10, value + 6);
  const shown = rolling ? (state.step * 7 + seed) % range : value;
  return (
    <span
      className={`num inline-block ${rolling ? "rolling" : reduce ? "" : "bump"} ${className}`}
      style={rolling ? { filter: `blur(${(state.blur * 1.2).toFixed(2)}px)` } : undefined}
      aria-label={String(value)}
    >
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
