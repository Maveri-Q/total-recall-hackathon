"use client";

import Link from "next/link";
import { useState } from "react";
import type { CallOutcome, Call } from "@/lib/call-result";
import { explorerTxUrl } from "@/lib/sui-stamp";
import { When } from "../ui/when";

export type CallCardView = {
  id: string;
  leagueName: string;
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
  outcome: CallOutcome;
  scored: boolean;
  score: string | null;
  result: Call | null;
  versions: { pick: Call; at: string; digest: string | null }[];
};

const STAMP = {
  locked: { text: "Locked", style: "border-ink text-ink bg-lime" },
  right: { text: "Spot on", style: "border-win text-win bg-[rgba(14,122,79,0.08)]" },
  wrong: { text: "Missed it", style: "border-loss text-loss bg-[rgba(192,54,44,0.06)]" },
  unscored: { text: "Not scored", style: "border-faint text-faint bg-[rgba(11,26,20,0.04)]" },
} as const;

function stampFor(c: CallCardView): keyof typeof STAMP {
  if (!c.scored) return "unscored";
  if (c.outcome === "open" || c.outcome === "waiting") return "locked";
  if (c.outcome === "called_it") return "right";
  if (c.outcome === "not_this_time") return "wrong";
  return "unscored"; // postponed or cancelled
}

const PICK_TEXT = (pick: Call, home: string, away: string) => (pick === "home" ? `${home} win` : pick === "away" ? `${away} win` : "Draw");

function CallCard({ c }: { c: CallCardView }) {
  const [open, setOpen] = useState(false);
  const latest = c.versions.at(-1)!;
  const stamp = STAMP[stampFor(c)];
  const finished = c.outcome === "called_it" || c.outcome === "not_this_time";
  const labels: [Call, string][] = [
    ["home", c.homeTeam],
    ["draw", "Draw"],
    ["away", c.awayTeam],
  ];
  return (
    <article className="glass relative flex flex-col gap-3.5 rounded-[24px] p-4">
      <span className={`stamp-in absolute right-3.5 top-4 rotate-[-8deg] rounded-[10px] border-[2.5px] px-2.5 py-1.5 font-display text-[15px] font-black tracking-[0.01em] ${stamp.style}`}>
        {stamp.text}
      </span>
      <div className="flex flex-col gap-0.5 pr-[110px]">
        <span className="text-[12px] font-bold text-faint">
          {c.leagueName}, <When iso={c.kickoffAt} format="weekdayTime" />
        </span>
        <span className="font-display text-[20px] font-extrabold tracking-[-0.03em]">
          {c.homeTeam} v {c.awayTeam}
        </span>
        {finished && c.score && <span className="text-[14px] font-semibold text-ink-2">Full time {c.score}</span>}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {labels.map(([pick, label]) => {
          const mine = pick === latest.pick;
          const res = finished && pick === c.result;
          return (
            <span
              key={pick}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[14px] p-1 text-center text-[13px] font-bold ${
                mine ? "bg-ink text-white" : res ? "border-[1.5px] border-win bg-[rgba(14,122,79,0.08)] text-ink" : "bg-[rgba(11,26,20,0.04)] text-faint"
              } ${mine && res ? "shadow-[inset_0_0_0_2px_#0FA968]" : ""}`}
            >
              <span className="max-w-full truncate">{label}</span>
              {mine && <span className="text-[10px] font-bold opacity-80">Your call</span>}
              {res && !mine && <span className="text-[10px] font-bold text-win">Result</span>}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {latest.digest && (
          <a href={explorerTxUrl(latest.digest)} target="_blank" rel="noreferrer" className="press inline-flex min-h-11 items-center rounded-full bg-ink px-3.5 text-[12px] font-bold text-white no-underline hover:text-white">
            Sui proof
          </a>
        )}
        <Link href="/proof" className="inline-flex min-h-11 items-center rounded-full bg-[rgba(11,26,20,0.06)] px-3.5 text-[12px] font-bold no-underline">
          On Walrus
        </Link>
        {c.versions.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="press min-h-11 cursor-pointer rounded-full border border-[rgba(11,26,20,0.12)] bg-transparent px-3.5 text-[12px] font-bold text-ink"
          >
            {open ? "Hide changes" : `Changed ${c.versions.length - 1} ${c.versions.length === 2 ? "time" : "times"}`}
          </button>
        )}
      </div>
      {open && (
        <ol className="reveal m-0 flex list-none flex-col p-0 pl-1">
          {c.versions.map((v, i) => {
            const last = i === c.versions.length - 1;
            return (
              <li key={v.at} className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-start gap-2.5 py-1.5">
                <span aria-hidden="true" className={`mt-1 h-2.5 w-2.5 rounded-full ${last ? "bg-ink" : "border-2 border-[#9AA8A1]"}`} />
                <span className="text-[13px] text-ink-2">
                  {i === 0 ? "Called" : "Changed to"} {PICK_TEXT(v.pick, c.homeTeam, c.awayTeam)}
                  {v.digest ? ", stamped on Sui" : ""}
                </span>
                <span className="text-[12px] text-faint">
                  <When iso={v.at} format="weekdayTime" />
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}

/** "Upcoming" and "Finished" tabs over the user's calls. */
export function CallsView({ calls }: { calls: CallCardView[] }) {
  const upcoming = calls.filter((c) => c.scored && (c.outcome === "open" || c.outcome === "waiting"));
  const finished = calls.filter((c) => !upcoming.includes(c));
  const [tab, setTab] = useState<"up" | "done">(upcoming.length > 0 ? "up" : "done");
  const shown = tab === "up" ? upcoming : finished;
  return (
    <>
      <div role="tablist" aria-label="Calls" className="glass grid grid-cols-2 gap-1 rounded-[18px] p-1">
        {(
          [
            ["up", `Upcoming ${upcoming.length}`],
            ["done", `Finished ${finished.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`press min-h-11 cursor-pointer rounded-[14px] border-none text-[14px] ${tab === key ? "bg-ink font-bold text-white" : "bg-transparent font-semibold text-ink-2"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="m-0 text-muted">
          {tab === "up" ? (
            <>
              No upcoming calls. Make one on <Link href="/">Matches</Link>.
            </>
          ) : (
            "No finished calls yet."
          )}
        </p>
      )}
      {shown.map((c) => (
        <CallCard key={c.id} c={c} />
      ))}
    </>
  );
}
