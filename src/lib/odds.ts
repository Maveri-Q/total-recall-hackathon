// Pure odds maths. No network calls here.

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
