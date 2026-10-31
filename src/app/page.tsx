import { Suspense } from "react";
import { connection } from "next/server";
import { myCallsOn, type MyCall } from "@/lib/calls";
import { bandScore, bookiesOf, getUpcomingMatches, polyOf, type UpcomingMatch } from "@/lib/coming-up";
import { readingGap, type GapBand } from "@/lib/data-job/memories";
import { LEAGUES } from "@/lib/leagues";
import { biggestGapGame, EARLY_SIGNAL_MATCHES, headline, MIN_GAMES_FOR_SCORE } from "@/lib/scoreline";
import { getCurrentUser } from "@/lib/supabase/server";
import { BottomNav } from "./bottom-nav";
import type { Featured } from "./coming-up/featured";
import { MatchList, type MatchView } from "./coming-up/match-list";
import { RecordCount } from "./coming-up/record-count";
import { WeekRange } from "./coming-up/week-range";
import { PageHeader } from "./ui/app-header";
import { Bone, GameCardSkeleton } from "./ui/skeleton";
import { PageTitle, Shell } from "./ui/shell";

/** The biggest-gap card only shows when the two sources are at least this far apart. */
const FEATURE_MIN_POINTS = 5;

// The header, title and intro draw once, straight away. Only the games stream in under them, so the title
// doesn't slide in a second time when the data arrives.
export default function Matches() {
  return (
    <Shell blobs={["lime", "green"]}>
      <PageHeader next="/" />
      <div className="flex flex-col gap-1.5 pt-3">
        <WeekRange />
        <PageTitle text="Coming up" />
        <p className="m-0 mt-1 text-[16px] leading-[1.45] text-muted">Bookies vs Polymarket on every big game, and who&apos;s been right before.</p>
      </div>
      <Suspense fallback={<GamesLoading />}>
        <Page />
      </Suspense>
      <BottomNav current="/" />
    </Shell>
  );
}

/** Placeholder tabs and cards, the same shape as the real ones, while this week's games load. */
function GamesLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-[18px]">
      <span className="sr-only">Loading this week&apos;s games</span>
      <div className="flex gap-2 overflow-hidden">
        {["w-16", "w-36", "w-24", "w-24"].map((w, i) => (
          <Bone key={i} className={`h-11 shrink-0 rounded-full ${w}`} />
        ))}
      </div>
      <Bone className="mt-1.5 h-7 w-48 rounded-md" />
      {[0, 1, 2].map((i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
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
    gap: r && bookies && poly ? readingGap(r) : null,
    call: latest
      ? {
          version: latest.version,
          pick: latest.pick,
          suiStatus: latest.sui_status,
          suiDigest: latest.sui_digest,
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

/** The record card for one game, filled from Walrus recall. Streams in on its own. */
async function Record({ m, band, weekAgo }: { m: MatchView; band: GapBand; weekAgo: string }) {
  let score;
  try {
    score = await bandScore(m.leagueCode, band, weekAgo);
  } catch (e) {
    console.error("bandScore", e);
    return <p className="m-0 text-[14px] text-muted">Couldn&apos;t load past games right now. Try again in a minute.</p>;
  }
  const recalled = score.recalled.map(({ matchId, label, closer, blobId }) => ({ matchId, label, closer, blobId }));
  return (
    <RecordCount
      bookies={score.bookies}
      polymarket={score.polymarket}
      games={score.games}
      leagueName={m.leagueName}
      min={MIN_GAMES_FOR_SCORE}
      early={EARLY_SIGNAL_MATCHES}
      recalled={recalled}
    />
  );
}

async function Page() {
  await connection();
  const now = new Date();
  const [matches, user] = await Promise.all([getUpcomingMatches(now), getCurrentUser()]);
  const calls = user ? await myCallsOn(matches.map((m) => m.id)) : new Map<string, MyCall>();
  const views = matches.map((m) => toView(m, calls.get(m.id)));

  // Biggest gap this week: games still to kick off, with a big enough Polymarket market, 5+ points apart.
  const polyOk = new Map(matches.map((m) => [m.id, m.reading?.poly_status === "ok"]));
  const best = biggestGapGame(
    views.map((v) => ({ ...v, polyOk: polyOk.get(v.id) ?? false })),
    now,
  );
  const featured: Featured | null =
    best && Math.round(best.gap.points) >= FEATURE_MIN_POINTS
      ? {
          id: best.id,
          leagueName: best.leagueName,
          kickoffAt: best.kickoffAt,
          title: `${best.home.short} v ${best.away.short}`,
          points: Math.round(best.gap.points),
          bookies: pct(best.gap.bookies),
          poly: pct(best.gap.poly),
          chanceOf: best.gap.outcome === "draw" ? "Chance of a draw" : `Chance ${best.gap.outcome === "home" ? best.home.short : best.away.short} win`,
        }
      : null;

  const weekAgo = new Date(Math.floor((now.getTime() - 7 * 24 * 3600_000) / 3600_000) * 3600_000).toISOString();
  const records = Object.fromEntries(
    views
      .filter((v) => v.bookies && v.poly)
      .map((v) => [
        v.id,
        <Suspense key={v.id} fallback={<div className="rounded-[20px] bg-[rgba(15,169,104,0.07)] p-4 text-[13px] text-muted">Checking past games on Walrus...</div>}>
          <Record m={v} band={headline(v.bookies!, v.poly!).band} weekAgo={weekAgo} />
        </Suspense>,
      ]),
  );

  return <MatchList matches={views} leagues={LEAGUES.map((l) => l.name)} featured={featured} records={records} signedIn={!!user} />;
}
