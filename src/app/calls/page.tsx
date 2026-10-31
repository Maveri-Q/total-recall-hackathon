import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { listMyCalls } from "@/lib/calls";
import { getMyScorecard } from "@/lib/scorecard";
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
    versions: c.versions.map((v) => ({ pick: v.pick, at: v.created_at, digest: v.sui_status === "stamped" ? v.sui_digest : null })),
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
          {me.againstPolymarket.total > 0 && (
            <span className="inline-flex items-center gap-[7px] self-start rounded-full bg-[rgba(15,169,104,0.1)] px-3 py-[7px] text-[13px] font-bold text-poly-text">
              <span aria-hidden="true" className="mark-poly" />
              Went against Polymarket&apos;s pick: right {me.againstPolymarket.right} of {me.againstPolymarket.total}
            </span>
          )}
        </div>
      </LampCard>
      <CallsView calls={views} />
    </div>
  );
}
