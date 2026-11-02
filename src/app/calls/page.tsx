import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { oddsVerdict } from "@/lib/call-result";
import { listMyCalls } from "@/lib/calls";
import { EARLY_SIGNAL_MATCHES, MIN_GAMES_FOR_SCORE } from "@/lib/scoreline";
import { getMyScorecard, type MyScorecard } from "@/lib/scorecard";
import { stampedBeforeKickoff } from "@/lib/sui-stamp";
import { getCurrentUser } from "@/lib/supabase/server";
import { BottomNav } from "../bottom-nav";
import { PageHeader } from "../ui/app-header";
import { Bone, CardSkeleton } from "../ui/skeleton";
import { LampCard } from "../ui/lamp-card";
import { RollingNumber } from "../ui/rolling-number";
import { PageTitle, Shell } from "../ui/shell";
import { CallsView, type CallCardView } from "./calls-view";

export const metadata: Metadata = { title: "My calls" };

export default function MyCalls() {
  return (
    <Shell blobs={["lime", "green"]}>
      <PageHeader next="/calls" />
      <div className="pt-2.5">
        <PageTitle text="My calls" />
      </div>
      <Suspense fallback={<CallsLoading />}>
        <Calls />
      </Suspense>
      <BottomNav current="/calls" />
    </Shell>
  );
}

/** Your form, newest last: one tile per recent finished call, empty tiles where there's no call yet. */
function Form({ results }: { results: boolean[] }) {
  const tiles = [...results.slice(-5), ...Array(Math.max(0, 5 - results.length)).fill(null)] as (boolean | null)[];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-bold text-hero-muted">Your form, newest last</span>
      <div className="grid grid-cols-5 gap-1.5">
        {tiles.map((t, i) => (
          <span
            key={i}
            role="img"
            aria-label={t === null ? "No call yet" : t ? "Spot on" : "Missed it"}
            className={`tok inline-flex h-10 items-center justify-center rounded-xl ${
              t === null ? "border-[1.5px] border-dashed border-[rgba(11,26,20,0.2)] bg-white/50" : t ? "bg-[rgba(15,169,104,0.14)] text-poly-text" : "bg-[rgba(192,54,44,0.1)] text-loss"
            }`}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            {t === true && (
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7.5 L6 10 L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {t === false && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * "You v the odds": your right calls against always backing the result the bookies and Polymarket rated most
 * likely, on the same games. A scoreline like Bookies v Polymarket, so it reads at a glance. Counted in code
 * (youVOdds), shown from 3 calls.
 */
function YouVOdds({ v }: { v: MyScorecard["vOdds"] }) {
  const big = "font-display text-[44px] font-black leading-[0.85] tracking-[-0.05em]";
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-[rgba(11,26,20,0.04)] p-3.5 lg:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[16px] font-bold">You v the odds</span>
        {v.calls < EARLY_SIGNAL_MATCHES && <span className="rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold text-white">Early signal</span>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end">
        <span className="flex flex-col gap-1">
          <span className="text-[13px] font-bold">You</span>
          <RollingNumber value={v.right} seed={5} className={`self-start ${big}`} />
        </span>
        <span className="pb-0.5 text-center text-[12px] font-semibold text-hero-muted">
          right in
          <br />
          <span className="num">{v.calls}</span> games
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="text-[13px] font-bold text-poly-text">The odds</span>
          <RollingNumber value={v.oddsRight} seed={6} className={`self-end text-poly-text ${big}`} />
        </span>
      </div>
      <span className="text-[14px] font-semibold">{oddsVerdict(v.right, v.oddsRight)}</span>
      <span className="text-[12px] leading-snug text-hero-muted">The odds always back the team the bookies and Polymarket rate most likely.</span>
    </div>
  );
}

/** Placeholder hero, tabs and a card, the same shape as the real ones, while the calls load. */
function CallsLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-[18px]">
      <span className="sr-only">Loading your calls</span>
      <CardSkeleton lines={4} className="min-h-[236px] rounded-[28px]" />
      <Bone className="h-[52px] rounded-[18px]" />
      <CardSkeleton lines={3} className="min-h-[200px] rounded-[24px]" />
    </div>
  );
}

async function Calls() {
  // Calls are personal and lock at kickoff, so always render them fresh.
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/calls");
  const [calls, me] = await Promise.all([listMyCalls(), getMyScorecard()]);

  const views: CallCardView[] = calls.map((c) => ({
    id: c.id,
    leagueName: c.league,
    kickoffAt: c.kickoffAt,
    homeTeam: c.homeTeam,
    awayTeam: c.awayTeam,
    outcome: c.outcome,
    scored: c.matchId !== null, // calls from before "Your call" existed aren't scored
    score: c.game?.home_goals != null ? `${c.game.home_goals}-${c.game.away_goals}` : null,
    result: c.game?.result ?? null,
    versions: c.versions.map((v) => ({
      pick: v.pick,
      at: v.created_at,
      digest: v.sui_status === "stamped" ? v.sui_digest : null,
      late: v.sui_status === "stamped" && !!v.stamped_at && !stampedBeforeKickoff(v.stamped_at, c.kickoffAt),
    })),
  }));
  const form = views
    .filter((c) => c.scored && (c.outcome === "called_it" || c.outcome === "not_this_time"))
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
    .map((c) => c.outcome === "called_it");
  const rate = me.settled ? Math.round((me.right / me.settled) * 100) : null;

  return (
    // Desktop (1024px+): your record across the top (number beside your form), your calls in two columns below.
    <div className="flex flex-col gap-[18px]">
      <LampCard className="lite flex flex-col gap-4 rounded-[28px] p-[18px]">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-end lg:gap-x-10">
          <div className="flex items-end justify-between gap-3">
            <span className="flex flex-col gap-1">
              <span className="flex items-baseline gap-1.5 font-display font-black tracking-[-0.05em]">
                <RollingNumber value={me.right} seed={3} className="text-[68px] leading-[0.85] text-hero-number" />
                <span className="num text-[28px] text-hero-muted">of {me.settled}</span>
              </span>
              <span className="text-[14px] font-semibold text-hero-muted">finished calls right</span>
            </span>
            {rate !== null && <span className="num rounded-2xl bg-ink px-3 py-2 font-display text-[22px] font-black tracking-[-0.03em] text-white">{rate}%</span>}
          </div>
          <Form results={form} />
          {me.vOdds.calls >= MIN_GAMES_FOR_SCORE && <YouVOdds v={me.vOdds} />}
        </div>
      </LampCard>
      <CallsView calls={views} />
    </div>
  );
}
