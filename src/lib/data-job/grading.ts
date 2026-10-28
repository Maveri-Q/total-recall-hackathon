// Grading after full time. Pure functions, no network or database (see run.ts for those).
//
// 1. Find the football-data.org match for one of our matches: both teams and the kickoff must agree,
//    and there must be exactly one candidate. Never guessed.
// 2. Take the 90-minute score. In a knockout game that goes to extra time, odds and Polymarket
//    markets are settled on 90 minutes, so extra-time goals don't count.
// 3. Score each reading with the Brier score and record which source was closer.
import type { Outcome } from "../odds";
import { brierScore, closerSource } from "../scoring";
import { KICKOFF_TOLERANCE_MS, sameTeam } from "./team-names";

type Goals = { home: number | null; away: number | null };

export type ResultMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string | null; shortName: string | null };
  awayTeam: { name: string | null; shortName: string | null };
  score: { duration?: string; fullTime: Goals; regularTime?: Goals };
};

export type ResultStatus = "finished" | "postponed" | "cancelled";

/** football-data.org status → ours. Anything else (not started, in play, suspended) isn't final yet. */
export function resultStatus(status: string): ResultStatus | null {
  if (status === "FINISHED") return "finished";
  if (status === "POSTPONED") return "postponed";
  if (status === "CANCELLED") return "cancelled";
  return null;
}

function teamAgrees(ourName: string, team: ResultMatch["homeTeam"]): boolean {
  return [team.name, team.shortName].some((n) => n && sameTeam(ourName, n));
}

/** The one football-data.org match with the same teams and kickoff, or null if there isn't exactly one. */
export function findResultMatch<T extends ResultMatch>(
  match: { homeTeam: string; awayTeam: string; kickoffAt: string },
  candidates: T[],
): T | null {
  const kickoff = new Date(match.kickoffAt).getTime();
  const found = candidates.filter(
    (c) =>
      teamAgrees(match.homeTeam, c.homeTeam) &&
      teamAgrees(match.awayTeam, c.awayTeam) &&
      Math.abs(new Date(c.utcDate).getTime() - kickoff) <= KICKOFF_TOLERANCE_MS,
  );
  return found.length === 1 ? found[0] : null;
}

/** Goals after 90 minutes (plus stoppage time), or null if the score isn't there. */
export function ninetyMinuteGoals(score: ResultMatch["score"]): { home: number; away: number } | null {
  const goals = score.regularTime ?? score.fullTime;
  if (goals.home === null || goals.away === null) return null;
  return { home: goals.home, away: goals.away };
}

export type ReadingChances = {
  bookie_home: number | string | null;
  bookie_draw: number | string | null;
  bookie_away: number | string | null;
  poly_home: number | string | null;
  poly_draw: number | string | null;
  poly_away: number | string | null;
  usable: boolean;
};

export type ReadingGrade = {
  bookie_brier: number | null;
  poly_brier: number | null;
  closer: "bookies" | "polymarket" | "tie" | null;
};

// Postgres numeric comes back from Supabase as a string or a number. Accept both.
function threeWay(home: unknown, draw: unknown, away: unknown) {
  if (home === null || draw === null || away === null) return null;
  return { home: Number(home), draw: Number(draw), away: Number(away) };
}

/**
 * Brier score for each source that has chances. "Closer" only for usable readings
 * (both sources there, market not thin, fetched within 5 minutes), so weak readings never count.
 */
export function gradeReading(r: ReadingChances, result: Outcome): ReadingGrade {
  const bookies = threeWay(r.bookie_home, r.bookie_draw, r.bookie_away);
  const poly = threeWay(r.poly_home, r.poly_draw, r.poly_away);
  const both =
    bookies && poly && r.usable
      ? closerSource({ name: "bookies", chances: bookies }, { name: "polymarket", chances: poly }, result)
      : null;
  return {
    bookie_brier: bookies ? brierScore(bookies, result) : null,
    poly_brier: poly ? brierScore(poly, result) : null,
    closer: both ? both.winner : null,
  };
}
