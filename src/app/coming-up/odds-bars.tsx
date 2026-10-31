"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Outcome, ThreeWay } from "@/lib/odds";

const pct = (x: number) => Math.round(x * 100);

// Every number inside a bar reaches 4.5:1 contrast: dark ink on the bright Polymarket green (5.9:1), and the
// bookies' draw grey a touch darker than UI.md's #6F7C75 so white stays readable on it (5.0:1).
const SHADES = {
  bookies: { bg: ["#1E2B25", "#65726B", "#D5DBD8"], text: ["#FFFFFF", "#FFFFFF", "#1E2B25"] },
  poly: { bg: ["#0FA968", "#7FD8B0", "#D3F2E4"], text: ["#0B1A14", "#06331F", "#06331F"] },
} as const;

function Row({ source, chances }: { source: "bookies" | "poly"; chances: ThreeWay }) {
  const s = SHADES[source];
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2">
      <span className={`inline-flex items-center gap-[7px] text-[13px] font-bold ${source === "bookies" ? "text-bookies" : "text-poly-text"}`}>
        <span aria-hidden="true" className={source === "bookies" ? "mark-bookies" : "mark-poly"} />
        {source === "bookies" ? "Bookies" : "Polymarket"}
      </span>
      <div data-bar className="bar-grow relative flex h-[30px] gap-[2px] overflow-hidden rounded-[9px]" role="img" aria-label={`${source === "bookies" ? "Bookies" : "Polymarket"}: home ${pct(chances.home)}%, draw ${pct(chances.draw)}%, away ${pct(chances.away)}%`}>
        {(["home", "draw", "away"] as const).map((o, i) => (
          <span
            key={o}
            className="num inline-flex min-w-[30px] items-center justify-center font-display text-[13px] font-extrabold"
            style={{ width: `${pct(chances[o])}%`, background: s.bg[i], color: s.text[i] }}
          >
            {pct(chances[o])}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** Space kept on each side of "Draw" (half its width plus a small gap), in px. */
const LABEL_ROOM = 18;

/** Bookies and Polymarket as two stacked bars, always both visible, then one verdict pill. */
export function OddsBars({
  bookies,
  poly,
  home,
  away,
  homeCode,
  awayCode,
  gap,
}: {
  bookies: ThreeWay;
  poly: ThreeWay | null;
  home: string;
  away: string;
  /** Short codes ("ESP") for when a name doesn't fit beside "Draw". */
  homeCode: string;
  awayCode: string;
  gap: { outcome: Outcome; points: number; polyHigher: boolean } | null;
}) {
  // Where the middle of the draw part of the bars is. A first guess from the chances, then measured from the
  // bars themselves (each part has a minimum width, so a small part is drawn wider than its percentage).
  const share = (o: Outcome) => (poly ? (bookies[o] + poly[o]) / 2 : bookies[o]);
  const [drawAt, setDrawAt] = useState(`${(share("home") + share("draw") / 2) * 100}%`);
  // Whether each team's full name fits beside "Draw". If not, its short code is shown, like a TV scoreboard.
  const [fits, setFits] = useState({ home: true, away: true });
  // The labels stay hidden until measured, so a long name never flashes cut off while the page loads.
  const [measured, setMeasured] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      // offsetLeft ignores the grow-in animation's transform, so this is where the parts end up.
      const centres = [...el.querySelectorAll<HTMLElement>("[data-bar]")].map((bar) => {
        const part = bar.children[1] as HTMLElement;
        return part.offsetLeft + part.offsetWidth / 2;
      });
      if (!centres.length) return;
      const draw = centres.reduce((a, b) => a + b, 0) / centres.length;
      setDrawAt(`${draw}px`);
      const row = el.querySelector<HTMLElement>("[data-labels]");
      const width = (side: string) => el.querySelector<HTMLElement>(`[data-full="${side}"]`)?.offsetWidth ?? 0;
      if (row) setFits({ home: width("home") <= draw - LABEL_ROOM, away: width("away") <= row.offsetWidth - draw - LABEL_ROOM });
      setMeasured(true);
    };
    measure();
    // Names are measured in the page font, so measure again once it has loaded.
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bookies, poly]);
  const n = gap ? Math.round(gap.points) : 0;
  const what = !gap ? "" : gap.outcome === "home" ? home : gap.outcome === "away" ? away : "a draw";
  const verdict = !poly
    ? "No Polymarket market for this game yet"
    : n >= 5
      ? `${gap!.polyHigher ? "Polymarket rates" : "Bookies rate"} ${what} ${n} points higher`
      : "They agree on this one";
  return (
    <div ref={box} className="flex flex-col gap-2">
      <Row source="bookies" chances={bookies} />
      {poly && <Row source="poly" chances={poly} />}
      {/* "Draw" sits exactly under the middle of the draw part (the two rows averaged). The team names hug the
          ends; a name too long to fit beside "Draw" shows its short code instead. */}
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 text-[12px] font-semibold text-faint">
        <span />
        <span data-labels className={`relative h-4 transition-opacity duration-150 ${measured ? "opacity-100" : "opacity-0"}`} style={{ "--draw": drawAt } as React.CSSProperties}>
          {/* Hidden copies of the full names, measured to decide whether they fit. */}
          <span aria-hidden="true" className="invisible absolute whitespace-nowrap">
            <span data-full="home">{home}</span>
            <span data-full="away">{away}</span>
          </span>
          <span className="absolute left-0 top-0 max-w-[calc(var(--draw)-18px)] truncate" title={home}>
            {fits.home ? home : homeCode}
          </span>
          <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: "var(--draw)" }}>
            Draw
          </span>
          <span className="absolute right-0 top-0 max-w-[calc(100%-var(--draw)-18px)] truncate text-right" title={away}>
            {fits.away ? away : awayCode}
          </span>
        </span>
      </div>
      <span
        className={`self-start rounded-full px-[11px] py-1.5 text-[13px] font-bold ${
          poly && n >= 5 ? "bg-[rgba(15,169,104,0.12)] text-poly-text" : "bg-[rgba(11,26,20,0.05)] text-muted"
        }`}
      >
        {verdict}
      </span>
    </div>
  );
}
