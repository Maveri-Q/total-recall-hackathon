"use client";

import { useEffect, useRef, useState } from "react";
import { KickoffTime } from "../kickoff-time";
import { useCountUp, useNow, useReducedMotion } from "./hooks";

export type Featured = {
  id: string;
  leagueName: string;
  kickoffAt: string;
  title: string;
  points: number;
  bookies: number;
  poly: number;
  /** "Chance Roma win" or "Chance of a draw" */
  chanceOf: string;
};

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `Updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
}

function GapNumber({ value, from }: { value: number; from: number | null }) {
  const gap = useCountUp(value, { from: from ?? value, ms: 500, run: from !== null && from !== value });
  return <span className="num font-display text-[56px] font-extrabold leading-[0.85] tracking-[-0.04em]">{gap.value}</span>;
}

/**
 * "Biggest gap today". Still on page load. When a different game takes the top spot while the page is open,
 * the old one slides out left, the new one slides in from the right and its gap counts up from 0.
 * Same game with new numbers: the gap just counts to its new value.
 */
export function FeaturedCard({ featured, checkedAt, onOpen }: { featured: Featured; checkedAt: string | null; onOpen: (id: string) => void }) {
  const reduce = useReducedMotion();
  const now = useNow();
  const [shown, setShown] = useState(featured);
  const [phase, setPhase] = useState<"still" | "out" | "in">("still");
  // Where the big number counts from: null on page load (no count), 0 for a new game, the old value for new numbers.
  const [countFrom, setCountFrom] = useState<number | null>(null);
  const prev = useRef(featured);

  useEffect(() => {
    const before = prev.current;
    prev.current = featured;
    if (featured === before) return;
    if (featured.id === before.id || reduce) {
      setCountFrom(featured.id === before.id && !reduce ? before.points : null);
      setShown(featured);
      return;
    }
    setPhase("out");
    const t = setTimeout(() => {
      setCountFrom(0);
      setShown(featured);
      setPhase("in");
    }, 250);
    return () => clearTimeout(t);
  }, [featured, reduce]);

  return (
    <button
      type="button"
      onClick={() => onOpen(shown.id)}
      aria-label={`Biggest gap today: ${shown.title}, ${shown.points} points apart. Open this game.`}
      className="lime-mint press w-full cursor-pointer overflow-hidden rounded-[24px] border-none p-[18px] text-left"
    >
      <span className={`flex flex-col gap-3.5 ${phase === "out" ? "slide-out" : phase === "in" ? "slide-in" : ""}`}>
        <span className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-[rgba(10,23,18,0.12)] px-2.5 py-1 text-[13px] font-semibold">Biggest gap today</span>
          <span className="text-[13px] font-medium">
            {shown.leagueName}, <KickoffTime iso={shown.kickoffAt} />
          </span>
        </span>
        <span className="font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.025em]">{shown.title}</span>
        <span className="flex items-end justify-between gap-3">
          <span className="flex items-baseline gap-2">
            <GapNumber key={`${shown.id}-${shown.points}`} value={shown.points} from={countFrom} />
            <span className="text-[15px] font-semibold leading-[1.2]">
              {shown.points === 1 ? "point" : "points"}
              <br />
              apart
            </span>
          </span>
          <span className="flex flex-col items-end gap-1 text-[14px] font-medium">
            <span>
              Bookies <span className="num font-display font-bold">{shown.bookies}%</span>
            </span>
            <span>
              Polymarket <span className="num font-display font-bold">{shown.poly}%</span>
            </span>
          </span>
        </span>
        <span className="text-[13px] opacity-75">
          {shown.chanceOf}. The bookies and Polymarket disagree most on this game today.
        </span>
        {checkedAt && now && <span className="text-[12px] opacity-70">{ago(checkedAt, now)}</span>}
      </span>
    </button>
  );
}
