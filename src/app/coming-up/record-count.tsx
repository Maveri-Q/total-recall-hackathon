"use client";

import Link from "next/link";
import { LampCard } from "../ui/lamp-card";
import { RollingNumber } from "../ui/rolling-number";

/** "When they disagreed like this before, Polymarket got closer in 9 of 14 Serie A games." */
function recordLine(b: number, p: number, n: number, league: string): string {
  const games = `${n} ${league} ${n === 1 ? "game" : "games"}`;
  if (p > b) return `When they disagreed like this before, Polymarket got closer in ${p} of ${games}.`;
  if (b > p) return `When they disagreed like this before, the bookies got closer in ${b} of ${games}.`;
  return `When they disagreed like this before, they were level: ${b} each in ${games}.`;
}

/**
 * Who's been closer in past games like this one (same league, same size of gap). The games come back
 * from Walrus recall; the counting is done in code. The numbers roll every time the card opens.
 */
export function RecordCount({
  bookies,
  polymarket,
  games,
  leagueName,
  min,
  early,
}: {
  bookies: number;
  polymarket: number;
  games: number;
  leagueName: string;
  min: number;
  /** Under this many games, the score is marked as an early signal. */
  early: number;
}) {
  if (games < min) {
    return (
      <p className="m-0 rounded-2xl bg-[rgba(11,26,20,0.04)] px-3.5 py-3 text-[14px] leading-normal text-muted">
        Too few past games like this yet. We&apos;ll show who&apos;s been closer after a few more are played.
      </p>
    );
  }
  return (
    <LampCard as="div" pitch={false} className="rounded-[20px] border border-[rgba(15,169,104,0.18)] bg-[rgba(15,169,104,0.07)] p-4">
      <div className="flex flex-col gap-3">
        <span className="text-[14px] font-semibold leading-[1.4]">{recordLine(bookies, polymarket, games, leagueName)}</span>
        {games < early && (
          <span className="self-start rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold text-white">Early signal, only {games} games</span>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end">
          <span className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
              <span aria-hidden="true" className="mark-bookies" />
              Bookies
            </span>
            <RollingNumber value={bookies} seed={1} className="self-start font-display text-[68px] font-black leading-[0.82] tracking-[-0.05em]" />
          </span>
          <span className="pb-1 text-center text-[12px] font-semibold text-muted">
            of <span className="num">{games}</span>
            <br />
            games
          </span>
          <span className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-poly-text">
              Polymarket
              <span aria-hidden="true" className="mark-poly" />
            </span>
            <RollingNumber value={polymarket} seed={4} className="self-end font-display text-[68px] font-black leading-[0.82] tracking-[-0.05em] text-poly-text" />
          </span>
        </div>
        <Link href="/proof" className="inline-flex min-h-11 items-center gap-1.5 self-start text-[12px] font-semibold text-poly-text no-underline">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="11" height="9" rx="2.2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M4 6h6M4 8.5h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Remembered on Walrus
        </Link>
      </div>
    </LampCard>
  );
}
