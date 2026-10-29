"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "../coming-up/hooks";

const ROLL_MS = 900;
const STEP_MS = 40;

/**
 * A hero number that rolls like a fast-spinning counter for about 0.9s (a new digit every 40ms, slightly
 * blurred), then lands on the real value with a pop and a green flash. Visible even when the value is 2.
 * Changing `runKey` rolls it again (e.g. when a tab changes). Reduced motion: the value shows straight away.
 */
export function RollingNumber({ value, seed = 1, runKey, className = "" }: { value: number; seed?: number; runKey?: string | number; className?: string }) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState<number | null>(0);

  useEffect(() => {
    if (reduce) return;
    let n = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restart the roll whenever the key changes
    setTick(0);
    const t = setInterval(() => {
      n++;
      if (n * STEP_MS >= ROLL_MS) {
        clearInterval(t);
        setTick(null);
      } else setTick(n);
    }, STEP_MS);
    return () => clearInterval(t);
  }, [reduce, runKey, value]);

  const rolling = !reduce && tick !== null;
  const shown = rolling ? (tick * 7 + seed) % Math.max(10, value + 6) : value;
  return (
    <span className={`num inline-block ${rolling ? "rolling" : reduce ? "" : "bump"} ${className}`} aria-label={String(value)}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
