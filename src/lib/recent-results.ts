// "Last week's results" on Matches, and the international break line. Pure functions, no network or database.
//
// A game is shown once it's graded and has a usable reading (the same one vote per match as the source records,
// see matchVerdict in data-job/memories.ts). We show the latest 7 days that have graded games, so during an
// international break the list still shows the last real round instead of going empty.
import { matchVerdict, type ReadingRow } from "./data-job/memories";
import { wholePercents, type Outcome, type ThreeWay } from "./odds";
import { resultFromScore } from "./scoring";

/** How many days of graded games make up "last week". */
export const RESULTS_WINDOW_DAYS = 7;

/** The first club game this far away or more means an international break. */
export const BREAK_MIN_DAYS = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

export type GradedMatch = {
  id: string;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  homeGoals: number;
  awayGoals: number;
  readings: ReadingRow[];
};

export type RecentResult = {
  id: string;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  homeGoals: number;
  awayGoals: number;
  result: Outcome;
  /** Whole-percent chance each source gave the result that happened. */
  bookies: number;
  poly: number;
  closer: "bookies" | "polymarket" | "tie";
};

function threeWay(h: unknown, d: unknown, a: unknown): ThreeWay | null {
  if (h == null || d == null || a == null) return null;
  return { home: Number(h), draw: Number(d), away: Number(a) };
}

/** Graded games from the latest 7 days that have any, newest first. */
export function recentResults(matches: GradedMatch[]): RecentResult[] {
  const all: RecentResult[] = [];
  for (const m of matches) {
    const verdict = matchVerdict(m.readings);
    if (!verdict) continue;
    const r = m.readings.find((x) => x.kind === verdict.kind)!;
    const b = threeWay(r.bookie_home, r.bookie_draw, r.bookie_away);
    const p = threeWay(r.poly_home, r.poly_draw, r.poly_away);
    if (!b || !p) continue;
    const result = resultFromScore(m.homeGoals, m.awayGoals);
    all.push({
      id: m.id,
      leagueName: m.leagueName,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      kickoffAt: m.kickoffAt,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      result,
      bookies: wholePercents(b)[result],
      poly: wholePercents(p)[result],
      closer: verdict.closer,
    });
  }
  all.sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt));
  if (all.length === 0) return [];
  const from = Date.parse(all[0].kickoffAt) - RESULTS_WINDOW_DAYS * DAY_MS;
  return all.filter((g) => Date.parse(g.kickoffAt) > from);
}

/** The count line: how many each source was closer in, and how many were too close to call. */
export function resultsTally(games: RecentResult[]): { bookies: number; polymarket: number; tooClose: number } {
  return {
    bookies: games.filter((g) => g.closer === "bookies").length,
    polymarket: games.filter((g) => g.closer === "polymarket").length,
    tooClose: games.filter((g) => g.closer === "tie").length,
  };
}

/** When club games come back after an international break, or null if the next game is within a few days. */
export function breakReturn(kickoffs: string[], now: number): Date | null {
  if (kickoffs.length === 0) return null;
  const first = Math.min(...kickoffs.map((k) => Date.parse(k)));
  return first - now >= BREAK_MIN_DAYS * DAY_MS ? new Date(first) : null;
}
