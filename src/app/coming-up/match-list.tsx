"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { callLabel, isCall, type Call } from "@/lib/call-result";
import { dayLabel } from "@/lib/local-time";
import type { Outcome, ThreeWay } from "@/lib/odds";
import type { TeamLook } from "@/lib/team-look";
import { When } from "../ui/when";
import { FeaturedCard, type Featured } from "./featured";
import { useNow } from "./hooks";
import { OddsBars } from "./odds-bars";
import { TeamBadge } from "./team-badge";
import { YourCall, type CurrentCall } from "./your-call";

export type MatchView = {
  id: string;
  leagueCode: string;
  leagueName: string;
  kickoffAt: string;
  home: TeamLook;
  away: TeamLook;
  bookies: ThreeWay | null;
  poly: ThreeWay | null;
  gap: { outcome: Outcome; points: number; polyHigher: boolean } | null;
  call: CurrentCall | null;
};

function Team({ team }: { team: TeamLook }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-1.5">
      <TeamBadge team={team} />
      <span className="max-w-full truncate font-display text-[16px] font-bold tracking-[-0.02em]">{team.short}</span>
    </span>
  );
}

function MatchCard({
  m,
  open,
  onToggle,
  record,
  signedIn,
  autoPick,
}: {
  m: MatchView;
  open: boolean;
  onToggle: () => void;
  record: ReactNode;
  signedIn: boolean;
  autoPick: Call | null;
}) {
  const cta = open ? "Close" : m.call ? `Your call: ${callLabel(m.call.pick, m.home.short, m.away.short)}` : "Make your call";
  return (
    <article id={`match-${m.id}`} className="glass flex scroll-mt-4 flex-col gap-3.5 rounded-[24px] p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
        <Team team={m.home} />
        <span className="flex flex-col items-center gap-px">
          <span className="font-display text-[22px] font-extrabold tracking-[-0.03em]">
            <When iso={m.kickoffAt} format="time" />
          </span>
          <span className="text-[12px] font-semibold text-faint">
            <When iso={m.kickoffAt} format="zone" />
          </span>
        </span>
        <Team team={m.away} />
      </div>

      {m.bookies ? (
        <OddsBars bookies={m.bookies} poly={m.poly} home={m.home.short} away={m.away.short} gap={m.gap} />
      ) : (
        <span className="flex items-center gap-2 text-[14px] text-muted">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.5V8l2.4 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Odds come in the day before kickoff.
        </span>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`press inline-flex cursor-pointer items-center justify-center gap-1.5 font-bold ${
          open
            ? "min-h-11 self-center border-none bg-transparent text-[13px] font-semibold text-muted"
            : "min-h-11 rounded-[14px] border border-[rgba(11,26,20,0.1)] bg-[rgba(11,26,20,0.04)] text-[14px] text-ink"
        }`}
      >
        {cta}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={open ? "rotate-180" : ""}>
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="reveal flex flex-col gap-3.5">
          {m.poly && record}
          <YourCall matchId={m.id} home={m.home.short} away={m.away.short} current={m.call} signedIn={signedIn} autoPick={autoPick} />
        </div>
      )}
    </article>
  );
}

/** League tabs, the biggest gap this week, then one section per league with its games by day. */
export function MatchList({
  matches,
  leagues,
  featured,
  records,
  signedIn,
}: {
  matches: MatchView[];
  /** Every covered league, in order, including ones with no games this week. */
  leagues: string[];
  featured: Featured | null;
  records: Record<string, ReactNode>;
  signedIn: boolean;
}) {
  const now = useNow();
  const params = useSearchParams();
  // "?call=<match id>.<pick>": a pick made before signing in. Open that game and stamp it.
  const [autoId, autoPickRaw] = (params.get("call") ?? "").split(".");
  const autoPick = isCall(autoPickRaw) && matches.some((m) => m.id === autoId) ? autoPickRaw : null;
  const [tab, setTab] = useState("All");
  const [openId, setOpenId] = useState<string | null>(autoPick ? autoId : null);

  const byLeague = new Map(leagues.map((l) => [l, matches.filter((m) => m.leagueName === l)]));
  const withGames = leagues.filter((l) => byLeague.get(l)!.length > 0);
  const empty = leagues.filter((l) => byLeague.get(l)!.length === 0);
  const shownLeagues = withGames.filter((l) => tab === "All" || tab === l);

  const open = (id: string) => {
    setTab("All");
    setOpenId(id);
    requestAnimationFrame(() => document.getElementById(`match-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      <div className="no-scrollbar -mx-[18px] flex gap-2 overflow-x-auto px-[18px] pb-1 pt-0.5" role="group" aria-label="Filter by league">
        {[{ name: "All", count: matches.length }, ...withGames.map((l) => ({ name: l, count: byLeague.get(l)!.length }))].map(({ name, count }) => {
          const on = tab === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => setTab(name)}
              className={`press inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold ${
                on ? "border border-ink bg-ink text-white" : "border border-white bg-[rgba(255,255,255,0.72)] text-ink shadow-[0_4px_14px_rgba(11,26,20,0.05)]"
              }`}
            >
              {name}
              <span className={`num rounded-full px-[7px] py-px text-[12px] font-bold ${on ? "bg-white/15" : "bg-[rgba(11,26,20,0.06)]"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {featured && <FeaturedCard featured={featured} onOpen={open} />}

      {shownLeagues.map((league) => {
        const games = byLeague.get(league)!;
        let lastDay = "";
        return (
          <section key={league} className="flex flex-col gap-2.5" aria-label={league}>
            <div className="flex items-baseline justify-between pt-1.5">
              <h2 className="m-0 font-display text-[26px] font-extrabold tracking-[-0.035em]">{league}</h2>
              <span className="text-[13px] font-semibold text-faint">
                {games.length} {games.length === 1 ? "game" : "games"}
              </span>
            </div>
            {games.map((m) => {
              const day = now === null ? "" : dayLabel(new Date(m.kickoffAt), new Date(now));
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <div key={m.id} className="flex flex-col gap-1.5">
                  {showDay && <span className="min-h-5 pl-0.5 text-[13px] font-bold text-faint">{day}</span>}
                  <MatchCard
                    m={m}
                    open={openId === m.id}
                    onToggle={() => setOpenId((id) => (id === m.id ? null : m.id))}
                    record={records[m.id]}
                    signedIn={signedIn}
                    autoPick={m.id === autoId ? autoPick : null}
                  />
                </div>
              );
            })}
          </section>
        );
      })}

      {matches.length === 0 && <p className="m-0 text-muted">No games in the next week. We check every hour.</p>}

      {tab === "All" && empty.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[13px] font-semibold text-faint">No games this week:</span>
          {empty.map((l) => (
            <span key={l} className="rounded-full bg-[rgba(11,26,20,0.05)] px-[11px] py-[5px] text-[13px] font-semibold text-ink-2">
              {l}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
