import { Suspense } from "react";
import { connection } from "next/server";
import { myCallsOn, type MyCall } from "@/lib/calls";
import { bandScore, bookiesOf, getUpcomingMatches, lastCheckedAt, polyOf, type UpcomingMatch } from "@/lib/coming-up";
import { readingGap, type GapBand } from "@/lib/data-job/memories";
import { biggestGapGame, headline, MIN_GAMES_FOR_SCORE } from "@/lib/scoreline";
import { getCurrentUser } from "@/lib/supabase/server";
import { BottomNav } from "./bottom-nav";
import { ComingUpHeader } from "./coming-up/header";
import type { Featured } from "./coming-up/featured";
import { MatchList, type MatchView } from "./coming-up/match-list";
import { RecordCount } from "./coming-up/record-count";

export default function ComingUp() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-[22px] px-[18px] pb-[calc(110px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]">
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    </main>
  );
}

function Loading() {
  return (
    <>
      <h1 className="m-0 pt-[21px] font-display text-[30px] font-bold leading-[1.05] tracking-[-0.02em]">Coming up</h1>
      <p className="text-faint">Loading games…</p>
    </>
  );
}

const pct = (x: number) => Math.round(x * 100);

function toView(m: UpcomingMatch, call: MyCall | undefined): MatchView {
  const r = m.reading;
  const bookies = r ? bookiesOf(r) : null;
  const poly = r && r.poly_status !== "not_found" ? polyOf(r) : null;
  const latest = call?.versions.at(-1);
  return {
    id: m.id,
    leagueCode: m.leagueCode,
    leagueName: m.leagueName,
    kickoffAt: m.kickoffAt,
    home: m.home,
    away: m.away,
    bookies,
    poly,
    polyStatus: r?.poly_status ?? null,
    gap: r && bookies && poly ? readingGap(r) : null,
    readingDigest: r?.sui_status === "stamped" ? r.sui_digest : null,
    call: latest
      ? { version: latest.version, pick: latest.pick, suiStatus: latest.sui_status, suiDigest: latest.sui_digest,
          stampedAt: latest.stamped_at,
          walrus:
            latest.walrus?.status === "saved"
              ? "saved"
              : latest.sui_status === "stamped" && latest.walrus?.status !== "failed"
                ? "saving"
                : null,
        }
      : null,
  };
}

/** The record panel for one game, filled from Walrus recall. Streams in on its own. */
async function Record({ m, band, weekAgo }: { m: MatchView; band: GapBand; weekAgo: string }) {
  let score;
  try {
    score = await bandScore(m.leagueCode, band, weekAgo);
  } catch (e) {
    console.error("bandScore", e);
    return <p className="m-0 text-[14px] text-faint">Couldn&apos;t load past games right now. Try again in a minute.</p>;
  }
  return (
    <RecordCount
      id={m.id}
      bookies={score.bookies}
      polymarket={score.polymarket}
      games={score.games}
      lastWeek={score.lastWeek}
      leagueName={m.leagueName}
      recent={score.recalled.map(({ label, kickoffAt, closer, blobId }) => ({ label, kickoffAt, closer, blobId }))}
      min={MIN_GAMES_FOR_SCORE}
    />
  );
}

function RecordLoading() {
  return <div className="deep rounded-[20px] px-4 py-4 text-[13px] text-faint">Checking past games on Walrus…</div>;
}

async function Page() {
  await connection();
  const now = new Date();
  const [matches, user, checkedAt] = await Promise.all([getUpcomingMatches(now), getCurrentUser(), lastCheckedAt()]);
  const calls = user ? await myCallsOn(matches.map((m) => m.id)) : new Map<string, MyCall>();
  const views = matches.map((m) => toView(m, calls.get(m.id)));

  const best = biggestGapGame(
    views.map((v) => ({ ...v, polyOk: v.polyStatus === "ok" })),
    now,
  );
  const featured: Featured | null = best && {
    id: best.id,
    leagueName: best.leagueName,
    kickoffAt: best.kickoffAt,
    title: `${best.home.short} v ${best.away.short}`,
    points: Math.round(best.gap.points),
    bookies: pct(best.gap.bookies),
    poly: pct(best.gap.poly),
    chanceOf:
      best.gap.outcome === "draw" ? "Chance of a draw" : `Chance ${best.gap.outcome === "home" ? best.home.short : best.away.short} win`,
  };

  // The record "as it stood a week ago", rounded to the hour so the cache can be shared.
  const weekAgo = new Date(Math.floor((now.getTime() - 7 * 24 * 3600_000) / 3600_000) * 3600_000).toISOString();
  const records = Object.fromEntries(
    views
      .filter((v) => v.bookies && v.poly)
      .map((v) => [
        v.id,
        <Suspense key={v.id} fallback={<RecordLoading />}>
          <Record m={v} band={headline(v.bookies!, v.poly!).band} weekAgo={weekAgo} />
        </Suspense>,
      ]),
  );

  return (
    <>
      <ComingUpHeader signedIn={!!user} />
      {views.length === 0 ? (
        <p className="text-faint">No games in the next day. We check every hour.</p>
      ) : (
        <MatchList matches={views} featured={featured} checkedAt={checkedAt} records={records} signedIn={!!user} />
      )}
      <BottomNav current="/" signedIn={!!user} />
    </>
  );
}
