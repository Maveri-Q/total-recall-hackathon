// Data for the Coming up page: upcoming matches, their latest reading, and the
// "Bookies vs Polymarket" score from similar past games recalled from Walrus Memory.
import "server-only";
import { cacheLife } from "next/cache";
import { bandCasesQuery, NAMESPACES, type GapBand, type ReadingRow } from "./data-job/memories";
import { leagueByCode } from "./leagues";
import type { ThreeWay } from "./odds";
import { scoreline, type PastGame, type Scoreline } from "./scoreline";
import { createAdminClient } from "./supabase/admin";
import { recallMemories } from "./walrus";

/** How many past games to ask Walrus for. More than enough at this stage of the season. */
const RECALL_LIMIT = 50;

export type UpcomingMatch = {
  id: string;
  leagueCode: string;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  reading: ReadingRow | null;
};

export type RecalledGame = { label: string; text: string; blobId: string };
export type BandScore = Scoreline & { recalled: RecalledGame[] };

function threeWay(h: unknown, d: unknown, a: unknown): ThreeWay | null {
  if (h == null || d == null || a == null) return null;
  return { home: Number(h), draw: Number(d), away: Number(a) };
}
export const bookiesOf = (r: ReadingRow) => threeWay(r.bookie_home, r.bookie_draw, r.bookie_away);
export const polyOf = (r: ReadingRow) => threeWay(r.poly_home, r.poly_draw, r.poly_away);

/** Matches that haven't kicked off yet, soonest first, each with its latest reading. */
export async function getUpcomingMatches(now: Date): Promise<UpcomingMatch[]> {
  const { data, error } = await createAdminClient()
    .from("matches")
    .select("id, league_code, home_team, away_team, kickoff_at, readings(*)")
    .gt("kickoff_at", now.toISOString())
    .order("kickoff_at");
  if (error) throw new Error(`loading matches: ${error.message}`);
  return (data ?? []).map((m) => {
    const readings = (m.readings ?? []) as ReadingRow[];
    return {
      id: m.id,
      leagueCode: m.league_code,
      leagueName: leagueByCode(m.league_code)?.name ?? m.league_code,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      kickoffAt: m.kickoff_at,
      reading: readings.sort((a, b) => b.odds_fetched_at.localeCompare(a.odds_fetched_at))[0] ?? null,
    };
  });
}

/**
 * The score in past games like this one (same league, same size of gap).
 * Walrus recall finds the similar graded games. Our own data says who was closer in each,
 * and scoreline() counts them. Cached for 15 minutes: new games are only added once an hour.
 */
export async function bandScore(leagueCode: string, band: GapBand): Promise<BandScore> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  const leagueName = leagueByCode(leagueCode)?.name ?? leagueCode;
  const recalled = await recallMemories(bandCasesQuery(leagueName, band), NAMESPACES.match_result, RECALL_LIMIT);
  if (recalled.length === 0) return { bookies: 0, polymarket: 0, level: 0, games: 0, counted: [], recalled: [] };

  // Which match each recalled memory is about, by its Walrus blob id.
  const db = createAdminClient();
  const { data: memories, error } = await db
    .from("memories")
    .select("ref_key, blob_id")
    .eq("kind", "match_result")
    .in("blob_id", recalled.map((r) => r.blobId));
  if (error) throw new Error(`loading memories: ${error.message}`);
  const matchIdByBlob = new Map((memories ?? []).map((m) => [m.blob_id as string, m.ref_key]));

  const { data: matches, error: matchError } = await db
    .from("matches")
    .select("id, league_code, home_team, away_team, home_goals, away_goals, kickoff_at, readings(*)")
    .in("id", [...matchIdByBlob.values()]);
  if (matchError) throw new Error(`loading past matches: ${matchError.message}`);
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

  const pastGames: PastGame[] = [];
  for (const r of recalled) {
    const match = matchById.get(matchIdByBlob.get(r.blobId) ?? "");
    if (match) pastGames.push({ matchId: match.id, leagueCode: match.league_code, readings: match.readings as ReadingRow[] });
  }
  const score = scoreline(pastGames, leagueCode, band);

  return {
    ...score,
    recalled: score.counted.map((id) => {
      const m = matchById.get(id)!;
      const memory = recalled.find((r) => matchIdByBlob.get(r.blobId) === id)!;
      return { label: `${m.home_team} ${m.home_goals}-${m.away_goals} ${m.away_team}`, text: memory.text, blobId: memory.blobId };
    }),
  };
}
