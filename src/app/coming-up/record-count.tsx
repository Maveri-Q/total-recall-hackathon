"use client";

import { walrusUrl } from "@/lib/walrus-links";
import { LampCard } from "../ui/lamp-card";
import { RollingNumber } from "../ui/rolling-number";

/** "When they disagreed like this before, Polymarket got closer in 9 of 14 Serie A games." */
function recordLine(b: number, p: number, n: number, league: string): string {
  const games = `${n} ${league} ${n === 1 ? "game" : "games"}`;
  if (p > b) return `When they disagreed like this before, Polymarket got closer in ${p} of ${games}.`;
  if (b > p) return `When they disagreed like this before, the bookies got closer in ${b} of ${games}.`;
  return `When they disagreed like this before, they were level: ${b} each in ${games}.`;
}

export type RecalledGame = { matchId: string; label: string; closer: "bookies" | "polymarket" | "tie"; blobId: string };

const CLOSER = { bookies: "Bookies closer", polymarket: "Polymarket closer", tie: "Level" } as const;
/** How many recalled games to list; the rest are counted in "and N more". */
const SHOW = 3;

/** The past games Walrus recalled for this one, nearest first. Each opens its memory on Walruscan. */
function Recalled({ games, title }: { games: RecalledGame[]; title: string }) {
  if (games.length === 0) return null;
  return (
    <div className="flex flex-col">
      <span className="pb-1 text-[12px] font-bold text-hero-muted">{title}</span>
      {games.slice(0, SHOW).map((g) => (
        <a
          key={g.matchId}
          href={walrusUrl(g.blobId)}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-10 items-center justify-between gap-2 border-t border-[rgba(11,26,20,0.06)] text-[13px] text-ink no-underline"
        >
          <span className="num min-w-0 truncate font-semibold">{g.label}</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-ink-2">
            {g.closer !== "tie" && <span aria-hidden="true" className={g.closer === "bookies" ? "mark-bookies" : "mark-poly"} />}
            {CLOSER[g.closer]}
          </span>
        </a>
      ))}
      {games.length > SHOW && (
        <span className="border-t border-[rgba(11,26,20,0.06)] pt-2 text-[12px] text-hero-muted">and {games.length - SHOW} more, all saved on Walrus</span>
      )}
    </div>
  );
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
  recalled,
}: {
  bookies: number;
  polymarket: number;
  games: number;
  leagueName: string;
  min: number;
  /** Under this many games, the score is marked as an early signal. */
  early: number;
  /** The past games Walrus brought back that were counted, nearest first. */
  recalled: RecalledGame[];
}) {
  if (games < min) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-[rgba(11,26,20,0.04)] px-3.5 py-3">
        <p className="m-0 text-[14px] leading-normal text-muted">
          Too few past games like this yet. We&apos;ll show who&apos;s been closer after a few more are played.
        </p>
        <Recalled games={recalled} title={`Walrus has found ${games} so far`} />
      </div>
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
        <Recalled games={recalled} title="The games Walrus brought back" />
      </div>
    </LampCard>
  );
}
