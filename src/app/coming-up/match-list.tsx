"use client";

import { useState, type ReactNode } from "react";
import type { Outcome, ThreeWay } from "@/lib/odds";
import type { TeamLook } from "@/lib/team-look";
import { explorerTxUrl } from "@/lib/sui-stamp";
import { KickoffTime } from "../kickoff-time";
import { FeaturedCard, type Featured } from "./featured";
import { useMounted } from "./hooks";
import { SlidingOdds } from "./sliding-odds";
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
  polyStatus: "ok" | "thin_market" | "not_found" | null;
  gap: { outcome: Outcome; points: number; polyHigher: boolean } | null;
  readingDigest: string | null;
  call: CurrentCall | null;
};

const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;

/** "Polymarket rates Roma 8 points higher than the bookies." or "They nearly agree. Only 3 points apart." */
function gapSentence(m: MatchView): string {
  if (!m.gap) return "";
  const n = Math.round(m.gap.points);
  if (n < 5) return n === 0 ? "They agree on this one." : `They nearly agree. Only ${points(n)} apart.`;
  const what = m.gap.outcome === "home" ? m.home.short : m.gap.outcome === "away" ? m.away.short : "a draw";
  return m.gap.polyHigher
    ? `Polymarket rates ${what} ${points(n)} higher than the bookies.`
    : `The bookies rate ${what} ${points(n)} higher than Polymarket.`;
}

function dayHeading(iso: string, mounted: boolean): string {
  // Before the browser takes over, group by UTC day so the server and first render agree.
  const d = new Date(iso);
  const today = new Date();
  const key = (x: Date) => (mounted ? x.toDateString() : x.toISOString().slice(0, 10));
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  if (key(d) === key(today)) return mounted && d.getHours() >= 17 ? "Tonight" : "Today";
  if (key(d) === key(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: mounted ? undefined : "UTC" });
}

function MatchCard({
  m,
  open,
  onToggle,
  record,
  signedIn,
}: {
  m: MatchView;
  open: boolean;
  onToggle: () => void;
  record: ReactNode;
  signedIn: boolean;
}) {
  const [touching, setTouching] = useState(false);
  const labels: [string, string, string] = [m.home.short, "Draw", m.away.short];

  return (
    <article
      id={`match-${m.id}`}
      className="glass flex scroll-mt-4 flex-col gap-4 rounded-[24px] px-4 py-[18px]"
      onPointerDown={() => setTouching(true)}
      onPointerUp={() => setTouching(false)}
      onPointerCancel={() => setTouching(false)}
      onPointerLeave={() => setTouching(false)}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-none bg-transparent p-0 text-center text-chalk"
      >
        <span className="flex min-w-0 flex-col items-center gap-1.5">
          <TeamBadge team={m.home} />
          <span className="max-w-full truncate font-display text-[16px] font-semibold tracking-[-0.01em]">{m.home.short}</span>
        </span>
        <span className="flex flex-col items-center gap-0.5">
          <span className="text-[12px] text-faint">{m.leagueName}</span>
          <span className="num font-display text-[22px] font-bold tracking-[-0.02em]">
            <KickoffTime iso={m.kickoffAt} timeOnly />
          </span>
        </span>
        <span className="flex min-w-0 flex-col items-center gap-1.5">
          <TeamBadge team={m.away} />
          <span className="max-w-full truncate font-display text-[16px] font-semibold tracking-[-0.01em]">{m.away.short}</span>
        </span>
      </button>

      {m.bookies ? (
        <div className="flex flex-col gap-2">
          <SlidingOdds id={m.id} bookies={m.bookies} poly={m.poly} labels={labels} paused={touching} />
          <span className="text-[13px] text-faint">
            {m.poly
              ? gapSentence(m)
              : "No Polymarket market for this game, so there's nothing to compare yet."}
          </span>
          {m.polyStatus === "thin_market" && (
            <span className="text-[13px] text-faint">Not much money on Polymarket for this game yet, so its price can jump around.</span>
          )}
        </div>
      ) : (
        <p className="m-0 text-[14px] text-faint">No odds yet. We check them the day before kickoff.</p>
      )}

      {open && (
        <div className="reveal flex flex-col gap-4">
          {m.poly && record}
          <YourCall matchId={m.id} home={m.home.short} away={m.away.short} current={m.call} signedIn={signedIn} />
          {m.readingDigest && (
            <p className="m-0 flex flex-col items-start text-[12px] text-fainter">
              <span>These odds were stamped on Sui before kickoff, so we can&apos;t change them later.</span>
              <a href={explorerTxUrl(m.readingDigest)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center">
                See the proof
              </a>
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/** League chips, the featured card, and the games grouped by day. One card open at a time. */
export function MatchList({
  matches,
  featured,
  checkedAt,
  records,
  signedIn,
}: {
  matches: MatchView[];
  featured: Featured | null;
  checkedAt: string | null;
  records: Record<string, ReactNode>;
  signedIn: boolean;
}) {
  const mounted = useMounted();
  const [league, setLeague] = useState("All");
  const [openId, setOpenId] = useState<string | null>(featured?.id ?? null);

  const leagues = ["All", ...new Set(matches.map((m) => m.leagueName))];
  const shown = matches.filter((m) => league === "All" || m.leagueName === league);
  const groups: { heading: string; items: MatchView[] }[] = [];
  for (const m of shown) {
    const heading = dayHeading(m.kickoffAt, mounted);
    const last = groups.at(-1);
    if (last?.heading === heading) last.items.push(m);
    else groups.push({ heading, items: [m] });
  }

  const openFeatured = (id: string) => {
    setLeague("All");
    setOpenId(id);
    requestAnimationFrame(() => document.getElementById(`match-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      {leagues.length > 2 && (
        <div className="no-scrollbar -mx-[18px] flex gap-2 overflow-x-auto px-[18px]" role="group" aria-label="Filter by league">
          {leagues.map((name) => {
            const on = league === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => setLeague(name)}
                className={`press min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 text-[14px] font-medium ${
                  on ? "border border-transparent bg-chalk text-ground" : "border border-white/10 bg-white/[0.04] text-muted"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {featured && <FeaturedCard featured={featured} checkedAt={checkedAt} onOpen={openFeatured} />}

      {groups.map((g) => (
        <section key={g.heading} className="flex flex-col gap-[22px]" aria-label={g.heading}>
          <h2 className="m-0 -mb-2 mt-1.5 font-display text-[20px] font-bold tracking-[-0.01em]">{g.heading}</h2>
          {g.items.map((m) => (
            <MatchCard
              key={m.id}
              m={m}
              open={openId === m.id}
              onToggle={() => setOpenId((id) => (id === m.id ? null : m.id))}
              record={records[m.id]}
              signedIn={signedIn}
            />
          ))}
        </section>
      ))}
    </>
  );
}
