// "How the scores changed" on the Memory page. Pure functions, no network or database.
//
// Each league's record counts only games where the bookies and Polymarket were 5 or more points apart:
// the "5 to 10" and "10 or more" gap groups added together (see gapBand in memories.ts). Small gaps are
// left out here because a near-agreement says little about who to trust. The record is shown now,
// a week ago and three weeks ago, counting only games that had kicked off by then.
import { gapBand, type Verdict } from "./data-job/memories";

/** The smallest gap, in points, that counts on the Memory page. Matches the start of the "5 to 10" group. */
export const DISAGREE_POINTS = 5;

export type GradedGame = { leagueCode: string; kickoffAt: string; verdict: Verdict };
export type Score = { bookies: number; polymarket: number; level: number; games: number };

/** The league's record from games 5+ points apart that kicked off by `cutoff` (or all of them). */
export function scoreAt(games: GradedGame[], leagueCode: string, cutoff?: Date): Score {
  const s: Score = { bookies: 0, polymarket: 0, level: 0, games: 0 };
  for (const g of games) {
    if (g.leagueCode !== leagueCode || gapBand(g.verdict.gapPoints) === "small") continue;
    if (cutoff && Date.parse(g.kickoffAt) > cutoff.getTime()) continue;
    s.games++;
    if (g.verdict.closer === "tie") s.level++;
    else s[g.verdict.closer]++;
  }
  return s;
}

export type LeagueHistory = { leagueCode: string; now: Score; lastWeek: Score | null; threeWeeksAgo: Score | null };

const DAY = 24 * 60 * 60 * 1000;

/**
 * One row per league that has graded games. A past point is left out (null) if it's from before
 * our first graded game, so the history never shows a made-up 0-0 from before we started.
 */
export function scoreHistory(games: GradedGame[], now: Date): LeagueHistory[] {
  if (games.length === 0) return [];
  const first = Math.min(...games.map((g) => Date.parse(g.kickoffAt)));
  const at = (code: string, daysAgo: number) => {
    const cutoff = new Date(now.getTime() - daysAgo * DAY);
    return cutoff.getTime() < first ? null : scoreAt(games, code, cutoff);
  };
  const leagues = [...new Set(games.map((g) => g.leagueCode))];
  return leagues
    .map((code) => ({ leagueCode: code, now: scoreAt(games, code), lastWeek: at(code, 7), threeWeeksAgo: at(code, 21) }))
    .sort((a, b) => b.now.games - a.now.games || a.leagueCode.localeCompare(b.leagueCode));
}

/** "3 weeks ago 2-3, last week 4-6, now 5-9" (bookies first). */
export function historyText(h: LeagueHistory): string {
  const s = (x: Score) => `${x.bookies}-${x.polymarket}`;
  return [
    h.threeWeeksAgo && `3 weeks ago ${s(h.threeWeeksAgo)}`,
    h.lastWeek && `last week ${s(h.lastWeek)}`,
    `now ${s(h.now)}`,
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/^./, (c) => c.toUpperCase());
}
