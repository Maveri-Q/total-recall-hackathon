// Data for the Scorecard page: how often the bookies and Polymarket were closer, by league and gap size,
// and the signed-in user's own record. All counting is done here in code (see memories.ts and call-result.ts);
// Walrus keeps a copy of each league's record, and we show which memory that is.
import "server-only";
import { cacheLife } from "next/cache";
import { againstRecord, callRecord } from "./call-result";
import { listMyCalls } from "./calls";
import { bookiesOf, polyOf } from "./coming-up";
import { matchVerdict, sourceRecord, type ReadingRow, type SourceRecord, type Verdict } from "./data-job/memories";
import { LEAGUES } from "./leagues";
import { recordSteps, type RecordStep } from "./memory-history";
import { favourite } from "./scoreline";
import { createAdminClient } from "./supabase/admin";

export type RecentGame = { label: string; kickoffAt: string; closer: Verdict["closer"] };
export type LeagueRecord = {
  code: string;
  name: string;
  record: SourceRecord;
  blobId: string | null;
  recent: RecentGame[];
  /** How the record moved as games were graded: each step is a memory saved on Walrus at the time. */
  history: RecordStep[];
};

/** Every league with at least one counted game, plus "All leagues" first. Cached for 15 minutes. */
export async function getSourceScorecard(): Promise<LeagueRecord[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  const db = createAdminClient();
  const { data: matches, error } = await db
    .from("matches")
    .select("league_code, home_team, away_team, home_goals, away_goals, kickoff_at, readings(*)")
    .eq("result_status", "finished")
    .not("graded_at", "is", null);
  if (error) throw new Error(`loading graded matches: ${error.message}`);

  const verdicts = new Map<string, Verdict[]>([["ALL", []]]);
  const recent = new Map<string, RecentGame[]>([["ALL", []]]);
  for (const m of matches ?? []) {
    const v = matchVerdict(m.readings as ReadingRow[]);
    if (!v) continue;
    verdicts.set(m.league_code, [...(verdicts.get(m.league_code) ?? []), v]);
    verdicts.get("ALL")!.push(v);
    const game = { label: `${m.home_team} ${m.home_goals}-${m.away_goals} ${m.away_team}`, kickoffAt: m.kickoff_at, closer: v.closer };
    recent.set(m.league_code, [...(recent.get(m.league_code) ?? []), game]);
    recent.get("ALL")!.push(game);
  }

  // Each league's saved Walrus records ("SA:3" is the Serie A record after 3 games): the newest one, and the steps before it.
  const { data: memories } = await db
    .from("memories")
    .select("ref_key, summary, saved_at, blob_id")
    .eq("kind", "source_record")
    .eq("status", "saved");
  const blobFor = (code: string, games: number) =>
    memories?.find((m) => m.ref_key === `${code}:${games}`)?.blob_id ?? null;

  return [...verdicts]
    .filter(([, vs]) => vs.length > 0)
    .map(([code, vs]) => ({
      code,
      name: code === "ALL" ? "All leagues" : (LEAGUES.find((l) => l.code === code)?.name ?? code),
      record: sourceRecord(vs),
      blobId: blobFor(code, vs.length),
      recent: (recent.get(code) ?? []).sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt)).slice(0, 3),
      history: recordSteps(memories ?? [], code),
    }))
    .sort((a, b) => (a.code === "ALL" ? -1 : b.code === "ALL" ? 1 : b.record.matches - a.record.matches));
}

export type MyScorecard = {
  right: number;
  settled: number;
  againstPolymarket: { right: number; total: number };
  againstBookies: { right: number; total: number };
};

/** The signed-in user's record, and how they did when they went against each source. */
export async function getMyScorecard(): Promise<MyScorecard> {
  const calls = (await listMyCalls()).filter((c) => c.matchId);
  const { data: readings } = await createAdminClient()
    .from("readings")
    .select("*")
    .in("match_id", calls.map((c) => c.matchId!));

  // Each source's most likely result in the latest reading before kickoff.
  const latest = new Map<string, ReadingRow>();
  for (const r of (readings ?? []) as (ReadingRow & { match_id: string })[]) {
    const seen = latest.get(r.match_id);
    if (!seen || r.odds_fetched_at > seen.odds_fetched_at) latest.set(r.match_id, r);
  }
  const rows = calls.map((c) => {
    const r = latest.get(c.matchId!);
    const poly = r && r.poly_status !== "not_found" ? polyOf(r) : null;
    const bookies = r ? bookiesOf(r) : null;
    return {
      call: c.versions.at(-1)!.pick,
      outcome: c.outcome,
      polyFavourite: poly ? favourite(poly) : null,
      bookieFavourite: bookies ? favourite(bookies) : null,
    };
  });

  const { right, settled } = callRecord(rows.map((r) => r.outcome));
  return {
    right,
    settled,
    againstPolymarket: againstRecord(rows.map((r) => ({ ...r, favourite: r.polyFavourite }))),
    againstBookies: againstRecord(rows.map((r) => ({ ...r, favourite: r.bookieFavourite }))),
  };
}
