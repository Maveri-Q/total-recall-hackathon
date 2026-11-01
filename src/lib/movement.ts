// The movement line on a match card: how each source moved between our two readings
// (the day-before reading and the one 2 to 4 hours before kickoff). Pure functions, no network or database.
//
// We look at the result that moved most in either source, so the line is about the biggest change.
// Under 2 points is noise: "No big change since our first check."
import { OUTCOMES, wholePercents, type Outcome, type ThreeWay } from "./odds";

/** A move smaller than this (in percentage points) doesn't count as a change. */
export const MIN_MOVE_POINTS = 2;

type Pair = { bookies: ThreeWay; poly: ThreeWay };

const moved = (a: ThreeWay, b: ThreeWay, o: Outcome) => Math.abs(b[o] - a[o]) * 100;

/** "Polymarket moved Arsenal from 52% to 60% since our first check. Bookies stayed at 55%." */
export function movementLine(first: Pair, latest: Pair, home: string, away: string): string {
  // The result with the biggest move in either source. Ties go to home, then draw, then away.
  let outcome: Outcome = "home";
  let most = -1;
  for (const o of OUTCOMES) {
    const m = Math.max(moved(first.bookies, latest.bookies, o), moved(first.poly, latest.poly, o));
    if (m > most + 1e-9) [outcome, most] = [o, m];
  }
  if (most < MIN_MOVE_POINTS) return "No big change since our first check.";

  const what = outcome === "draw" ? "the draw" : outcome === "home" ? home : away;
  const sameWay = (first.poly[outcome] - latest.poly[outcome]) * (first.bookies[outcome] - latest.bookies[outcome]) > 0;
  const sentence = (source: string, a: ThreeWay, b: ThreeWay, lead: boolean) => {
    const from = wholePercents(a)[outcome];
    const to = wholePercents(b)[outcome];
    const since = lead ? " since our first check" : "";
    const small = moved(a, b, outcome) < MIN_MOVE_POINTS;
    if (!lead && !small && sameWay) return `${source} did the same, ${from}% to ${to}%.`;
    if (small) return from === to ? `${source} stayed at ${to}%.` : `${source} hardly moved, ${from}% to ${to}%.`;
    return `${source} moved ${what} from ${from}% to ${to}%${since}.`;
  };

  // The source that moved more goes first.
  const polyFirst = moved(first.poly, latest.poly, outcome) >= moved(first.bookies, latest.bookies, outcome);
  return polyFirst
    ? `${sentence("Polymarket", first.poly, latest.poly, true)} ${sentence("Bookies", first.bookies, latest.bookies, false)}`
    : `${sentence("Bookies", first.bookies, latest.bookies, true)} ${sentence("Polymarket", first.poly, latest.poly, false)}`;
}
