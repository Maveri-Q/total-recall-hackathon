import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { EARLY_SIGNAL_MATCHES, type GapBand, type SourceRecord } from "@/lib/data-job/memories";
import { getMyScorecard, getSourceScorecard } from "@/lib/scorecard";
import { getCurrentUser } from "@/lib/supabase/server";
import { PageHeader } from "../nav";

export default function Scorecard() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <PageHeader title="Scorecard" current="/scorecard" />
      <p>After every game, we check who got closer to the real result: the bookies or Polymarket.</p>
      <Suspense fallback={<p>Loading the scorecard…</p>}>
        <Sources />
      </Suspense>
      <h2 className="mt-2 text-xl font-bold">Your record</h2>
      <Suspense fallback={<p>Loading your record…</p>}>
        <Mine />
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
        <h2 className="text-xl font-bold">By league</h2>
        <ul className="flex flex-col gap-2">
          {leagues.map((l) => (
            <li key={l.code} className="border p-3">
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
        <h2 className="text-xl font-bold">When they disagreed</h2>
        <p className="text-sm">All leagues, by how far apart the bookies and Polymarket were before kickoff.</p>
        <ul className="flex flex-col gap-2">
          {BANDS.map(({ band, label }) => {
            const r = all.record.byBand[band];
            return (
              <li key={band} className="border p-3">
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
    <div className="flex flex-col gap-1 border p-3">
      <p className="font-bold">
        You&apos;ve called {me.right} of {me.settled} right.
      </p>
      {against("Polymarket", me.againstPolymarket)}
      {against("the bookies", me.againstBookies)}
      {me.settled < EARLY_SIGNAL_MATCHES && <p className="text-sm">Early signal: fewer than {EARLY_SIGNAL_MATCHES} games.</p>}
    </div>
  );
}
