"use client";

import { LampCard } from "../ui/lamp-card";
import { When } from "../ui/when";

export type Featured = {
  id: string;
  leagueName: string;
  kickoffAt: string;
  title: string;
  points: number;
  bookies: number;
  poly: number;
  /** "Chance Arsenal win" or "Chance of a draw" */
  chanceOf: string;
};

function Bar({ source, value }: { source: "bookies" | "poly"; value: number }) {
  const poly = source === "poly";
  return (
    <span className="flex flex-col gap-1">
      <span className={`flex justify-between text-[13px] font-bold ${poly ? "text-poly-text" : ""}`}>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={poly ? "mark-poly" : "mark-bookies"} />
          {poly ? "Polymarket" : "Bookies"}
        </span>
        <span className="num font-display font-extrabold">{value}%</span>
      </span>
      <span className={`h-2 overflow-hidden rounded-full ${poly ? "bg-[rgba(15,169,104,0.12)]" : "bg-[rgba(11,26,20,0.08)]"}`}>
        <span className={`bar-grow block h-full rounded-full ${poly ? "bg-poly" : "bg-bookies"}`} style={{ width: `${value}%` }} />
      </span>
    </span>
  );
}

/** "Biggest gap this week": only shown when the two sources are 5 or more points apart. Tapping opens the game. */
export function FeaturedCard({ featured: f, onOpen }: { featured: Featured; onOpen: (id: string) => void }) {
  return (
    <LampCard aria-label="Biggest gap this week" className="glass rounded-[28px]">
      <div aria-hidden="true" className="aurora pointer-events-none absolute -bottom-[110px] -right-[90px] h-[260px] w-[300px] rounded-full bg-[radial-gradient(closest-side,rgba(15,169,104,0.28),rgba(198,243,107,0.2)_60%,transparent_100%)] blur-[20px]" />
      <button
        type="button"
        onClick={() => onOpen(f.id)}
        className="relative flex w-full cursor-pointer flex-col gap-4 border-none bg-transparent p-[18px] text-left text-ink"
        aria-label={`Biggest gap this week: ${f.title}, ${f.points} points apart. Open this game.`}
      >
        <span className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-lime px-[11px] py-[5px] text-[12px] font-bold">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ink" />
            Biggest gap this week
          </span>
          <span className="pt-1 font-display text-[28px] font-extrabold leading-[1.05] tracking-[-0.035em]">{f.title}</span>
          <span className="text-[13px] font-medium text-muted">
            {f.leagueName}, <When iso={f.kickoffAt} format="weekdayTime" />. {f.chanceOf}.
          </span>
        </span>
        <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-[18px]">
          <span className="flex flex-col gap-0.5">
            <span className="num font-display text-[72px] font-black leading-[0.8] tracking-[-0.06em] text-hero-number">{f.points}</span>
            <span className="text-[12px] font-bold text-muted">points apart</span>
          </span>
          <span className="flex flex-col gap-2.5">
            <Bar source="bookies" value={f.bookies} />
            <Bar source="poly" value={f.poly} />
          </span>
        </span>
      </button>
    </LampCard>
  );
}
