// Pure odds maths. No network calls here.
//
// How we turn prices into chances (documented for the README):
// - Bookmaker decimal odds: raw chance = 1 ÷ odds. The three raw chances add up to more than 100%
//   because of the bookie's margin, so we divide each by their sum to get a fair 3-way split.
// - Polymarket: each outcome has its own Yes price (0 to 1). The three rarely add up to exactly 1,
//   so we normalise them the same way.

export type Outcome = "home" | "draw" | "away";
export const OUTCOMES: readonly Outcome[] = ["home", "draw", "away"];

/** Chances for the three outcomes, as fractions that add up to 1. */
export type ThreeWay = Record<Outcome, number>;

/**
 * Bookmaker implied probability, as a percentage: 100 ÷ decimal odds.
 * Returns null for odds that can't be real (missing, not a number, or 1.00 or below).
 */
export function impliedProbability(decimalOdds: number | null | undefined): number | null {
  if (decimalOdds == null || !Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    return null;
  }
  return 100 / decimalOdds;
}

/** Scales three non-negative numbers so they add up to 1. Null if any is missing or all are 0. */
export function normalise(values: Record<Outcome, number | null | undefined>): ThreeWay | null {
  const nums = OUTCOMES.map((o) => values[o]);
  if (nums.some((n) => n == null || !Number.isFinite(n) || n < 0)) return null;
  const total = (nums as number[]).reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  return { home: values.home! / total, draw: values.draw! / total, away: values.away! / total };
}

/** The bookie's margin (overround) as a fraction, e.g. 0.05 for 5%. Null for bad odds. */
export function bookmakerMargin(odds: Record<Outcome, number>): number | null {
  if (OUTCOMES.some((o) => impliedProbability(odds[o]) === null)) return null;
  return OUTCOMES.reduce((sum, o) => sum + 1 / odds[o], 0) - 1;
}

/** Decimal odds for home/draw/away -> fair chances with the bookie's margin removed. */
export function chancesFromOdds(odds: Record<Outcome, number>): ThreeWay | null {
  if (OUTCOMES.some((o) => impliedProbability(odds[o]) === null)) return null;
  return normalise({ home: 1 / odds.home, draw: 1 / odds.draw, away: 1 / odds.away });
}

/** Polymarket Yes prices (0 to 1) for home/draw/away -> chances that add up to 1. */
export function chancesFromPrices(prices: Record<Outcome, number>): ThreeWay | null {
  if (OUTCOMES.some((o) => !(prices[o] >= 0 && prices[o] <= 1))) return null;
  return normalise(prices);
}

/** The biggest gap between two sources on any outcome, in percentage points (0 to 100). */
export function biggestGap(a: ThreeWay, b: ThreeWay): { outcome: Outcome; points: number } {
  let best = { outcome: "home" as Outcome, points: 0 };
  for (const o of OUTCOMES) {
    const points = Math.abs(a[o] - b[o]) * 100;
    if (points > best.points) best = { outcome: o, points };
  }
  return best;
}

/**
 * Whole percentages that always add up to exactly 100 (largest remainder): round each down, then give the
 * points left over to the outcomes with the biggest fractions. Plain rounding can show 53 + 25 + 23 = 101.
 */
export function wholePercents(c: ThreeWay): ThreeWay {
  const raw = OUTCOMES.map((o) => c[o] * 100);
  const total = Math.round(raw.reduce((a, b) => a + b, 0));
  const floors = raw.map(Math.floor);
  let left = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - floors[i] })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i]++;
    left--;
  }
  return { home: floors[0], draw: floors[1], away: floors[2] };
}
