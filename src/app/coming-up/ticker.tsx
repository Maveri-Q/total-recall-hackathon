"use client";

import { useEffect, useState } from "react";
import { tickerFact, type TickerLine } from "@/lib/ticker";
import { When } from "../ui/when";

/** How often an open page asks for fresh lines. The data job runs hourly, so this is plenty. */
const REFRESH_MS = 10 * 60_000;
/** Scroll speed: seconds per line, so a long board doesn't race past. */
const SECONDS_PER_LINE = 5;

function Line({ line, onOpen, copy }: { line: TickerLine; onOpen: (matchId: string) => void; copy: boolean }) {
  const game = (
    <span className="text-white">
      {line.home} v {line.away}
    </span>
  );
  const fact =
    line.kind === "due" ? (
      <>
        Odds land <When iso={line.at} format="weekdayTime" />
      </>
    ) : (
      tickerFact(line)
    );
  const body = (
    <>
      {game}
      <span aria-hidden="true" className="mx-2.5 text-white/35">
        /
      </span>
      <span className={line.kind === "result" ? "text-[#9FE1CB]" : "text-lime"}>{fact}</span>
    </>
  );
  return (
    <li className="flex shrink-0 items-center">
      {"matchId" in line ? (
        <button type="button" tabIndex={copy ? -1 : undefined} onClick={() => onOpen(line.matchId)} className="cursor-pointer whitespace-nowrap border-none bg-transparent p-0 font-[inherit] uppercase tracking-[inherit]">
          {body}
        </button>
      ) : (
        <span className="whitespace-nowrap">{body}</span>
      )}
      {/* A small lime scale mark between lines, like the logo's. */}
      <span aria-hidden="true" className="mx-5 inline-block h-3.5 w-[3px] rounded-full bg-lime/70" />
    </li>
  );
}

/**
 * The pitchside LED board under "Coming up": one line per game, scrolling. Tap a game to open its card.
 * Hides itself when there's nothing to show. Stops scrolling (and can be swiped) under reduced motion.
 */
export function Ticker({ initial, onOpen }: { initial: TickerLine[]; onOpen: (matchId: string) => void }) {
  const [lines, setLines] = useState(initial);

  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/ticker", { cache: "no-store" });
        if (res.ok) setLines(await res.json());
      } catch {
        // keep the lines we have
      }
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  if (lines.length === 0) return null;
  const list = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className={`${copy ? "ticker-copy " : ""}m-0 flex shrink-0 list-none items-center p-0 pl-5`}>
      {lines.map((l, i) => (
        <Line key={i} line={l} onOpen={onOpen} copy={copy} />
      ))}
    </ul>
  );
  return (
    <section aria-label="This week at a glance" className="ticker relative rounded-[14px] bg-ink">
      <div className="ticker-track flex w-max py-3 font-mono text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ animationDuration: `${lines.length * SECONDS_PER_LINE}s` }}>
        {list(false)}
        {list(true)}
      </div>
    </section>
  );
}
