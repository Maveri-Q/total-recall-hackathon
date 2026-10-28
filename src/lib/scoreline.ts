// The "Bookies vs Polymarket" scoreline on the Coming up page. Pure functions, no network or database.
//
// Walrus recall picks the past games that look like this one. This code then keeps only the ones
// in the same league with the same size of gap, and counts who was closer (by Brier score, already
// worked out at grading). Same games in, same score out.
import { gapBand, matchVerdict, EARLY_SIGNAL_MATCHES, type GapBand, type ReadingRow } from "./data-job/memories";
import { biggestGap, OUTCOMES, type Outcome, type ThreeWay } from "./odds";

/** Below this many similar past games, no score is shown. */
export const MIN_GAMES_FOR_SCORE = EARLY_SIGNAL_MATCHES;

export type PastGame = {
  matchId: string;
  leagueCode: string;
  readings: ReadingRow[];
};

export type Scoreline = {
  bookies: number;
  polymarket: number;
  level: number;
  games: number;
  /** The past games that were counted, nearest match from Walrus first. */
  counted: string[];
};

/** Counts who was closer across recalled past games in the same league and gap band. */
export function scoreline(recalled: PastGame[], leagueCode: string, band: GapBand): Scoreline {
  const score: Scoreline = { bookies: 0, polymarket: 0, level: 0, games: 0, counted: [] };
  const seen = new Set<string>();
  for (const game of recalled) {
    if (seen.has(game.matchId) || game.leagueCode !== leagueCode) continue;
    seen.add(game.matchId);
    const verdict = matchVerdict(game.readings);
    if (!verdict || gapBand(verdict.gapPoints) !== band) continue;
    score.games++;
    score.counted.push(game.matchId);
    if (verdict.closer === "tie") score.level++;
    else score[verdict.closer]++;
  }
  return score;
}

/** The result the two sources disagree on most, with each source's chance for it. */
export function headline(bookies: ThreeWay, poly: ThreeWay): { outcome: Outcome; bookies: number; poly: number; band: GapBand } {
  const gap = biggestGap(bookies, poly);
  return { outcome: gap.outcome, bookies: bookies[gap.outcome], poly: poly[gap.outcome], band: gapBand(gap.points) };
}

/** The bookies' favourite, for when there's nothing to compare against. */
export function favourite(chances: ThreeWay): Outcome {
  return OUTCOMES.reduce((best, o) => (chances[o] > chances[best] ? o : best), "home" as Outcome);
}
