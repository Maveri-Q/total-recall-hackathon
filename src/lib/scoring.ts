// Grading maths. Pure functions, no network or database.
//
// Brier score for a 3-way match (home/draw/away):
//   sum over the three outcomes of (chance given - what happened)², where "what happened" is 1 for
//   the actual result and 0 for the other two. 0 is a perfect forecast, 2 is the worst possible.
//   Lower is better, so the source with the lower score "was closer".
import { OUTCOMES, type Outcome, type ThreeWay } from "./odds";

/** Small differences are treated as a tie so rounding noise never decides a winner. */
export const TIE_MARGIN = 0.0005;

export function brierScore(chances: ThreeWay, result: Outcome): number {
  return OUTCOMES.reduce((sum, o) => {
    const happened = o === result ? 1 : 0;
    return sum + (chances[o] - happened) ** 2;
  }, 0);
}

export type Closer<A extends string, B extends string> = A | B | "tie";

/** Which of two sources was closer to the result, by Brier score. */
export function closerSource<A extends string, B extends string>(
  a: { name: A; chances: ThreeWay },
  b: { name: B; chances: ThreeWay },
  result: Outcome,
): { winner: Closer<A, B>; scores: Record<A | B, number> } {
  const scoreA = brierScore(a.chances, result);
  const scoreB = brierScore(b.chances, result);
  const scores = { [a.name]: scoreA, [b.name]: scoreB } as Record<A | B, number>;
  if (Math.abs(scoreA - scoreB) < TIE_MARGIN) return { winner: "tie", scores };
  return { winner: scoreA < scoreB ? a.name : b.name, scores };
}

/** Result from full-time goals. */
export function resultFromScore(homeGoals: number, awayGoals: number): Outcome {
  if (homeGoals > awayGoals) return "home";
  if (homeGoals < awayGoals) return "away";
  return "draw";
}
