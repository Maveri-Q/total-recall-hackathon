// Data for the Coming up page: upcoming matches, their latest reading, how each team looks, and the
// "Bookies vs Polymarket" record from similar past games recalled from Walrus Memory.
import "server-only";
import { cacheLife } from "next/cache";
import { bandCasesQuery, matchVerdict, NAMESPACES, type GapBand, type ReadingRow } from "./data-job/memories";
import { leagueByCode } from "./leagues";
import type { ThreeWay } from "./odds";
import { scoreline, type PastGame, type Scoreline } from "./scoreline";
import { createAdminClient } from "./supabase/admin";
import { teamLook, type TeamLook, type TeamRow } from "./team-look";
import type { TickerResult } from "./ticker";
import { recallMemories } from "./walrus";

/** How many past games to ask Walrus for. More than enough at this stage of the season. */
const RECALL_LIMIT = 50;

export type UpcomingMatch = {
  id: string;
  leagueCode: string;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  home: TeamLook;
  away: TeamLook;
  kickoffAt: string;
  reading: ReadingRow | null;
};

export type RecalledGame = {
  matchId: string;
  label: string;
  kickoffAt: string;
  closer: "bookies" | "polymarket" | "tie";
  text: string;
  blobId: string;
};
export type BandScore = Scoreline & { recalled: RecalledGame[]; lastWeek: Scoreline };

function threeWay(h: unknown, d: unknown, a: unknown): ThreeWay | null {
  if (h == null || d == null || a == null) return null;
  return { home: Number(h), draw: Number(d), away: Number(a) };
}
export const bookiesOf = (r: ReadingRow) => threeWay(r.bookie_home, r.bookie_draw, r.bookie_away);
export const polyOf = (r: ReadingRow) => threeWay(r.poly_home, r.poly_draw, r.poly_away);

async function cachedTeams(): Promise<TeamRow[]> {
  "use cache";
  cacheLife("days");
  const { data, error } = await createAdminClient()
    .from("teams")
    .select("football_data_id, league_code, name, short_name, tla, crest_url, club_colors");
  if (error) throw new Error(error.message); // thrown, so a failure is never cached
  return data ?? [];
}

/** Every team we know (see scripts/sync-teams.mts). Empty if the teams can't be loaded: badges fall back to initials. */
async function allTeams(): Promise<TeamRow[]> {
  try {
    return await cachedTeams();
  } catch (e) {
    console.warn("teams not loaded, using initials badges:", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Matches that haven't kicked off yet, soonest first, each with its latest reading. */
export async function getUpcomingMatches(now: Date): Promise<UpcomingMatch[]> {
  const [{ data, error }, teams] = await Promise.all([
    createAdminClient()
      .from("matches")
      .select("id, league_code, home_team, away_team, kickoff_at, readings(*)")
      .gt("kickoff_at", now.toISOString())
      .order("kickoff_at"),
    allTeams(),
  ]);
  if (error) throw new Error(`loading matches: ${error.message}`);
  return (data ?? []).map((m) => {
    const readings = (m.readings ?? []) as ReadingRow[];
    const leagueTeams = teams.filter((t) => t.league_code === m.league_code);
    return {
      id: m.id,
      leagueCode: m.league_code,
      leagueName: leagueByCode(m.league_code)?.name ?? m.league_code,
      homeTeam: m.home_team,
      awayTeam: m.away_team,
      home: teamLook(m.home_team, leagueTeams),
      away: teamLook(m.away_team, leagueTeams),
      kickoffAt: m.kickoff_at,
      reading: readings.sort((a, b) => b.odds_fetched_at.localeCompare(a.odds_fetched_at))[0] ?? null,
    };
  });
}

/** Games graded in the last two days, with who got closer, for the ticker's full-time lines. */
export async function getRecentResults(now: Date): Promise<TickerResult[]> {
  const since = new Date(now.getTime() - 48 * 3600_000).toISOString();
  const [{ data, error }, teams] = await Promise.all([
    createAdminClient()
      .from("matches")
      .select("league_code, home_team, away_team, home_goals, away_goals, kickoff_at, readings(*)")
      .eq("result_status", "finished")
      .not("graded_at", "is", null)
      .gte("kickoff_at", since),
    allTeams(),
  ]);
  if (error) throw new Error(`loading recent results: ${error.message}`);
  return (data ?? []).flatMap((m) => {
    const v = matchVerdict(m.readings as ReadingRow[]);
    if (!v || m.home_goals == null || m.away_goals == null) return [];
    const leagueTeams = teams.filter((t) => t.league_code === m.league_code);
    return [
      {
        home: teamLook(m.home_team, leagueTeams).short,
        away: teamLook(m.away_team, leagueTeams).short,
        homeGoals: m.home_goals,
        awayGoals: m.away_goals,
        kickoffAt: m.kickoff_at,
        closer: v.closer,
      },
    ];
  });
}

/** When the hourly data job last finished, for "Updated 20 min ago". */
export async function lastCheckedAt(): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("job_runs")
    .select("finished_at")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.finished_at ?? null;
}

/**
 * The record in past games like this one (same league, same size of gap), now and as it stood a week ago.
 * Walrus recall finds the similar graded games. Our own data says who was closer in each,
 * and scoreline() counts them. Cached for 15 minutes: new games are only added once an hour.
 * `weekAgo` is passed in (rounded to the hour) so the cache can be shared.
 */
export async function bandScore(leagueCode: string, band: GapBand, weekAgo: string): Promise<BandScore> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });

  const empty: Scoreline = { bookies: 0, polymarket: 0, level: 0, games: 0, counted: [] };
  const leagueName = leagueByCode(leagueCode)?.name ?? leagueCode;
  const recalled = await recallMemories(bandCasesQuery(leagueName, band), NAMESPACES.match_result, RECALL_LIMIT);
  if (recalled.length === 0) return { ...empty, recalled: [], lastWeek: empty };

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
    if (match) {
      pastGames.push({ matchId: match.id, leagueCode: match.league_code, kickoffAt: match.kickoff_at, readings: match.readings as ReadingRow[] });
    }
  }
  const score = scoreline(pastGames, leagueCode, band);

  return {
    ...score,
    lastWeek: scoreline(pastGames, leagueCode, band, new Date(weekAgo)),
    recalled: score.counted.map(({ matchId, closer }) => {
      const m = matchById.get(matchId)!;
      const memory = recalled.find((r) => matchIdByBlob.get(r.blobId) === matchId)!;
      return {
        matchId,
        label: `${m.home_team} ${m.home_goals}-${m.away_goals} ${m.away_team}`,
        kickoffAt: m.kickoff_at,
        closer,
        text: memory.text,
        blobId: memory.blobId,
      };
    }),
  };
}
