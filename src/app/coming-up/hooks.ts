"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";

/** True when the viewer has asked their device for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCE);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
}

/**
 * False on the server and on the first render in the browser, true after that.
 * Anything based on the viewer's own clock or time zone waits for this, so the page hydrates cleanly.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the one render after hydration is the point
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Counts from `from` to `to` over `ms`, fast at first and slowing at the end. Returns the shown value. */
export function useCountUp(to: number, { from = 0, ms = 1000, run = true }: { from?: number; ms?: number; run?: boolean } = {}) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ value: run && !reduce ? from : to, done: !run || reduce });
  useEffect(() => {
    if (!run || reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 2.2);
      setState({ value: Math.floor(from + (to - from) * eased + (p === 1 ? 0.0001 : 0)), done: p === 1 });
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, from, ms, run, reduce]);
  return run && !reduce ? state : { value: to, done: true };
}

/** The current time, updated every `everyMs`. Null until the page is running in the browser. */
export function useNow(everyMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the clock once in the browser
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
