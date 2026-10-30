// The pitchside LED ticker on Matches: one short line per game, built from the same readings as the match
// cards, so it updates whenever the hourly data job does. Pure functions, tested in ticker.test.ts.
import { favourite } from "./scoreline";
import type { Outcome, ThreeWay } from "./odds";
import { firstReadingAt } from "./data-job/schedule";

/** At or above this many points apart, a game is a "gap" line; below it, the sources agree. Same as the match cards. */
export const GAP_POINTS = 5;
const MAX_LINES = 12;
const MAX_RESULTS = 3;
const MAX_DUE = 3;

export type TickerLine =
  | { kind: "gap"; matchId: string; home: string; away: string; source: "Polymarket" | "Bookies"; pick: string; points: number }
  | { kind: "agree"; matchId: string; home: string; away: string; pick: string }
  | { kind: "due"; matchId: string; home: string; away: string; at: string }
  | { kind: "result"; home: string; away: string; score: string; closer: "bookies" | "polymarket" | "tie" };

export type TickerGame = {
  id: string;
  kickoffAt: string;
  home: string;
  away: string;
  bookies: ThreeWay | null;
  poly: ThreeWay | null;
  gap: { outcome: Outcome; points: number; polyHigher: boolean } | null;
};

export type TickerResult = { home: string; away: string; homeGoals: number; awayGoals: number; kickoffAt: string; closer: "bookies" | "polymarket" | "tie" };

/** "Chelsea", "a draw": how a pick reads inside a sentence. */
function pickName(o: Outcome, home: string, away: string): string {
  return o === "draw" ? "a draw" : o === "home" ? home : away;
}

/**
 * The lines, in reading order: games where the sources disagree (biggest gap first), games where they agree
 * (soonest first), games still waiting for odds, then the latest full-time results.
 */
export function tickerLines(games: TickerGame[], results: TickerResult[], now: Date): TickerLine[] {
  const upcoming = games.filter((g) => Date.parse(g.kickoffAt) > now.getTime()).sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
  const gaps: TickerLine[] = [];
  const agrees: TickerLine[] = [];
  const due: TickerLine[] = [];
  for (const g of upcoming) {
    const base = { matchId: g.id, home: g.home, away: g.away };
    if (g.bookies && g.poly && g.gap) {
      const points = Math.round(g.gap.points);
      if (points >= GAP_POINTS) {
        gaps.push({ kind: "gap", ...base, source: g.gap.polyHigher ? "Polymarket" : "Bookies", pick: pickName(g.gap.outcome, g.home, g.away), points });
      } else {
        agrees.push({ kind: "agree", ...base, pick: pickName(favourite(g.bookies), g.home, g.away) });
      }
    } else if (!g.bookies) {
      due.push({ kind: "due", ...base, at: firstReadingAt(g.kickoffAt).toISOString() });
    }
  }
  gaps.sort((a, b) => (b.kind === "gap" && a.kind === "gap" ? b.points - a.points : 0));
  const finished: TickerLine[] = [...results]
    .sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt))
    .slice(0, MAX_RESULTS)
    .map((r) => ({ kind: "result", home: r.home, away: r.away, score: `${r.homeGoals}-${r.awayGoals}`, closer: r.closer }));
  return [...gaps, ...agrees, ...due.slice(0, MAX_DUE), ...finished].slice(0, MAX_LINES);
}

/** The second half of a line, after the game: the one thing worth knowing about it. `when` is the local time text. */
export function tickerFact(line: TickerLine, when = ""): string {
  switch (line.kind) {
    case "gap":
      return `${line.source} ${line.source === "Bookies" ? "rate" : "rates"} ${line.pick} ${line.points} pts higher`;
    case "agree":
      return line.pick === "a draw" ? "Both lean towards a draw" : `Both make ${line.pick} favourites`;
    case "due":
      return `Odds land ${when}`.trim();
    case "result":
      return line.closer === "tie" ? `FT ${line.score}. Dead heat` : `FT ${line.score}. ${line.closer === "polymarket" ? "Polymarket" : "Bookies"} got closer`;
  }
}
