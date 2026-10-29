import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { EARLY_SIGNAL_MATCHES, type GapBand, type SourceRecord } from "@/lib/data-job/memories";
import { getMyScorecard, getSourceScorecard } from "@/lib/scorecard";
import { getCurrentUser } from "@/lib/supabase/server";
import { BottomNav } from "../bottom-nav";

export const metadata: Metadata = { title: "Scorecard" };

export default function Scorecard() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-[22px] px-[18px] pb-[calc(110px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]">
      <Link href="/memory" className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] text-muted no-underline hover:text-chalk">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Memory
      </Link>
      <h1 className="m-0 font-display text-[30px] font-bold leading-[1.05] tracking-[-0.02em]">Scorecard</h1>
      <p className="m-0 text-muted">After every game, we check who got closer to the real result: the bookies or Polymarket.</p>
      <Suspense fallback={<p>Loading the scorecard…</p>}>
        <Sources />
      </Suspense>
      <h2 className="m-0 mt-1 font-display text-[20px] font-bold tracking-[-0.01em]">Your record</h2>
      <Suspense fallback={<p>Loading your record…</p>}>
        <Mine />
      </Suspense>
      <Suspense>
        <Nav />
      </Suspense>
    </main>
  );
}

const games = (n: number) => `${n} ${n === 1 ? "game" : "games"}`;

function Score({ r }: { r: Pick<SourceRecord, "bookies" | "polymarket" | "ties" | "matches"> }) {
  return (
    <>
      Bookies {r.bookies} – {r.polymarket} Polymarket
      {r.ties > 0 && `, ${r.ties} level`} · {games(r.matches)}
    </>
  );
}

const BANDS: { band: GapBand; label: string }[] = [
  { band: "small", label: "Small gap (under 5 points)" },
  { band: "medium", label: "Medium gap (5 to 10 points)" },
  { band: "big", label: "Big gap (10 points or more)" },
];

async function Sources() {
  let leagues;
  try {
    leagues = await getSourceScorecard();
  } catch (e) {
    console.error("scorecard", e);
    return <p>Couldn&apos;t load the scorecard right now. Try again in a minute.</p>;
  }
  if (leagues.length === 0) return <p>No finished games yet. The first scores show up after full time.</p>;
  const all = leagues[0];

  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-[20px] font-bold tracking-[-0.01em]">By league</h2>
        <ul className="flex flex-col gap-2">
          {leagues.map((l) => (
            <li key={l.code} className="glass rounded-[24px] px-4 py-[18px]">
              <p className="font-bold">{l.name}</p>
              <p>
                <Score r={l.record} />
              </p>
              {l.record.matches < EARLY_SIGNAL_MATCHES && (
                <p className="text-sm">Early signal: fewer than {EARLY_SIGNAL_MATCHES} games.</p>
              )}
              {l.blobId && <p className="text-sm opacity-70">Saved on Walrus: {l.blobId}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 font-display text-[20px] font-bold tracking-[-0.01em]">When they disagreed</h2>
        <p className="text-sm">All leagues, by how far apart the bookies and Polymarket were before kickoff.</p>
        <ul className="flex flex-col gap-2">
          {BANDS.map(({ band, label }) => {
            const r = all.record.byBand[band];
            return (
              <li key={band} className="glass rounded-[24px] px-4 py-[18px]">
                <p className="font-bold">{label}</p>
                <p>{r.matches > 0 ? <Score r={r} /> : "No games yet."}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

async function Mine() {
  await connection();
  if (!(await getCurrentUser())) {
    return (
      <p>
        <Link href="/login" className="underline">
          Log in
        </Link>{" "}
        to see how your calls are doing.
      </p>
    );
  }
  const me = await getMyScorecard();
  if (me.settled === 0) return <p>No finished calls yet. Your record starts after your first game ends.</p>;

  const against = (label: string, r: { right: number; total: number }) =>
    r.total > 0 && (
      <p>
        When you went against {label}, you were right {r.right} of {r.total} {r.total === 1 ? "time" : "times"}.
      </p>
    );

  return (
    <div className="glass flex flex-col gap-1 rounded-[24px] px-4 py-[18px]">
      <p className="font-bold">
        You&apos;ve called {me.right} of {me.settled} right.
      </p>
      {against("Polymarket", me.againstPolymarket)}
      {against("the bookies", me.againstBookies)}
      {me.settled < EARLY_SIGNAL_MATCHES && <p className="text-sm">Early signal: fewer than {EARLY_SIGNAL_MATCHES} games.</p>}
    </div>
  );
}

async function Nav() {
  await connection();
  return <BottomNav current={null} signedIn={!!(await getCurrentUser())} />;
}
