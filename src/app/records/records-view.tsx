"use client";

import Link from "next/link";
import { useState } from "react";
import type { GapBand } from "@/lib/data-job/memories";
import { leader, type RecordStep } from "@/lib/memory-history";
import type { LeagueRecord } from "@/lib/scorecard";
import { walrusUrl } from "@/lib/walrus-links";
import { When } from "../ui/when";
import { LampCard } from "../ui/lamp-card";
import { RollingNumber } from "../ui/rolling-number";

type Tab = "all" | GapBand;
const TABS: { key: Tab; label: string; sub: string }[] = [
  { key: "all", label: "All", sub: "any gap" },
  { key: "small", label: "Close", sub: "under 5" },
  { key: "medium", label: "Medium", sub: "5 to 10" },
  { key: "big", label: "Big", sub: "10+" },
];
const TITLE: Record<Tab, string> = {
  all: "All graded games",
  small: "Close games, under 5 points apart",
  medium: "5 to 10 points apart",
  big: "10 or more points apart",
};

const MIN = 10;

/** Bookies (charcoal) and Polymarket (green) share of the games one of them won. */
function SplitBar({ b, p, height }: { b: number; p: number; height: string }) {
  const total = b + p;
  const wb = total ? (b / total) * 100 : 0;
  return (
    <span className={`flex w-full gap-[2px] overflow-hidden rounded-full bg-[rgba(11,26,20,0.08)] ${height}`} aria-hidden="true">
      <span className="rounded-full bg-bookies transition-[width] duration-500" style={{ width: `${wb}%` }} />
      <span className="rounded-full bg-poly transition-[width] duration-500" style={{ width: `${total ? 100 - wb : 0}%` }} />
    </span>
  );
}

const CLOSER = { bookies: "Bookies closer", polymarket: "Polymarket closer", tie: "Level" } as const;

const COLOUR = { polymarket: "text-poly-text", bookies: "text-bookies", level: "text-ink" } as const;

/** The leader first, so it reads like a scoreline: "Polymarket 7-3", "Bookies 4-3", "Level 2-2". */
function scoreText(s: RecordStep): string {
  const l = leader(s);
  if (l === "level") return `Level ${s.bookies}-${s.polymarket}`;
  return l === "polymarket" ? `Polymarket ${s.polymarket}-${s.bookies}` : `Bookies ${s.bookies}-${s.polymarket}`;
}

/** Show at most this many steps; the newest are kept. */
const MAX_STEPS = 6;

/**
 * "How this changed": the record after each step, oldest on the left, as saved on Walrus at the time.
 * Each step opens its memory on Walruscan. Only shown once there are two steps to compare.
 */
function HowItChanged({ steps }: { steps: RecordStep[] }) {
  if (steps.length < 2) return null;
  const shown = steps.slice(-MAX_STEPS);
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold text-ink">How this changed</span>
        <span className="text-[12px] text-hero-muted">The record each time a game was graded, saved on Walrus that day. Tap one to check it.</span>
      </span>
      <ol className="no-scrollbar m-0 flex list-none items-center gap-1.5 overflow-x-auto p-0">
        {shown.map((s, i) => (
          <li key={s.games} className="flex shrink-0 items-center gap-1.5">
            {i > 0 && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="text-faint">
                <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <a
              href={walrusUrl(s.blobId)}
              target="_blank"
              rel="noreferrer"
              aria-label={`After ${s.games} ${s.games === 1 ? "game" : "games"}: bookies ${s.bookies}, Polymarket ${s.polymarket}. Check it on Walrus.`}
              className={`press flex min-h-11 flex-col items-start justify-center gap-px rounded-[12px] border px-2.5 py-1.5 no-underline ${
                i === shown.length - 1 ? "border-ink bg-white" : "border-[rgba(11,26,20,0.08)] bg-white/60"
              }`}
            >
              <span className="whitespace-nowrap text-[11px] font-semibold text-faint">
                After {s.games} {s.games === 1 ? "game" : "games"}
              </span>
              <span className={`num whitespace-nowrap font-display text-[14px] font-extrabold ${COLOUR[leader(s)]}`}>{scoreText(s)}</span>
              <span className="whitespace-nowrap text-[11px] text-faint">
                <When iso={s.savedAt} format="day" />
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function RecordsView({ all, leagues }: { all: LeagueRecord | null; leagues: LeagueRecord[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>(null);
  const rec = all ? (tab === "all" ? all.record : all.record.byBand[tab]) : null;
  const games = rec?.matches ?? 0;
  const b = rec?.bookies ?? 0;
  const p = rec?.polymarket ?? 0;

  return (
    <>
      <LampCard className="lite flex flex-col gap-3.5 rounded-[28px] p-[18px]">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-hero-muted">{TITLE[tab]}</span>
            {games > 0 && games < MIN && <span className="rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold text-white">Early signal</span>}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end">
            <span className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-bookies">
                <span aria-hidden="true" className="mark-bookies" />
                Bookies
              </span>
              <RollingNumber value={b} seed={1} runKey={tab} className="self-start font-display text-[76px] font-black leading-[0.82] tracking-[-0.05em]" />
            </span>
            <span className="pb-1.5 text-center text-[12px] font-semibold text-hero-muted">
              of <span className="num">{games}</span>
              <br />
              {games === 1 ? "game" : "games"}
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-poly-text">
                Polymarket
                <span aria-hidden="true" className="mark-poly" />
              </span>
              <RollingNumber value={p} seed={4} runKey={tab} className="self-end font-display text-[76px] font-black leading-[0.82] tracking-[-0.05em] text-hero-number" />
            </span>
          </div>
          <SplitBar b={b} p={p} height="h-2.5" />
          {tab === "all" && all && <HowItChanged steps={all.history} />}
          {games === 0 && <span className="text-[14px] text-hero-muted">No games with a gap this big yet. Check back after the weekend.</span>}
        </div>
      </LampCard>

      <section className="flex flex-col gap-2.5" aria-labelledby="gap-matter">
        <div className="flex flex-col gap-0.5">
          <h2 id="gap-matter" className="m-0 font-display text-[24px] font-extrabold tracking-[-0.035em]">
            Does the gap matter?
          </h2>
          <span className="text-[14px] text-muted">Pick how far apart they were before kickoff.</span>
        </div>
        <div role="tablist" aria-label="Gap size" className="glass grid grid-cols-4 gap-1 rounded-[18px] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`press flex min-h-[52px] cursor-pointer flex-col items-center justify-center rounded-[14px] border-none text-[14px] ${
                tab === t.key ? "bg-ink font-bold text-white" : "bg-transparent font-semibold text-ink-2"
              }`}
            >
              <span>{t.label}</span>
              <span className="text-[11px] font-semibold opacity-75">{t.sub}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5" aria-labelledby="by-league">
        <h2 id="by-league" className="m-0 font-display text-[24px] font-extrabold tracking-[-0.035em]">
          By league
        </h2>
        {leagues.length === 0 && <p className="m-0 text-muted">No finished games yet.</p>}
        {leagues.map((l) => {
          const r = l.record;
          const isOpen = open === l.code;
          return (
            <div key={l.code} className="glass overflow-hidden rounded-[22px]">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : l.code)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer flex-col gap-2.5 border-none bg-transparent px-4 py-3.5 text-left text-ink"
              >
                <span className="flex w-full items-baseline justify-between">
                  <span className="font-display text-[17px] font-bold tracking-[-0.02em]">{l.name}</span>
                  <span className="num font-display text-[17px] font-extrabold" aria-label={`Bookies ${r.bookies}, Polymarket ${r.polymarket}`}>
                    <span className="text-bookies">{r.bookies}</span> <span className="text-[#9AA8A1]">-</span>{" "}
                    <span className="text-poly-text">{r.polymarket}</span>
                  </span>
                </span>
                <SplitBar b={r.bookies} p={r.polymarket} height="h-2" />
                <span className="text-[12px] font-semibold text-faint">
                  {r.matches} {r.matches === 1 ? "game" : "games"}.{r.matches < MIN ? " Early signal, under 10 games." : ""}
                </span>
              </button>
              {isOpen && (
                <div className="reveal flex flex-col px-4 pb-3">
                  {l.history.length > 1 && (
                    <div className="pb-3">
                      <HowItChanged steps={l.history} />
                    </div>
                  )}
                  {l.recent.map((g) => (
                    <div key={g.label + g.kickoffAt} className="flex items-center justify-between gap-2 border-t border-[rgba(11,26,20,0.06)] py-[9px] text-[13px]">
                      <span className="num font-semibold">{g.label}</span>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink-2">
                        {g.closer !== "tie" && <span aria-hidden="true" className={g.closer === "bookies" ? "mark-bookies" : "mark-poly"} />}
                        {CLOSER[g.closer]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <Link href="/proof" className="inline-flex min-h-11 items-center self-center text-center text-[13px] font-semibold text-poly-text">
        Every record here is saved on Walrus. See the proof.
      </Link>
    </>
  );
}
