// "Your call": labels and results. Pure functions, no network or database.
import type { Outcome } from "./odds";

export const CALLS = ["home", "draw", "away"] as const;
export type Call = Outcome;

export function isCall(value: unknown): value is Call {
  return typeof value === "string" && (CALLS as readonly string[]).includes(value);
}

/** "Roma win", "Draw", "Cagliari win". */
export function callLabel(call: Call, homeTeam: string, awayTeam: string): string {
  return call === "home" ? `${homeTeam} win` : call === "away" ? `${awayTeam} win` : "Draw";
}

export type CallOutcome = "open" | "waiting" | "called_it" | "not_this_time" | "postponed" | "cancelled";

/**
 * Where a call stands. The call that counts is the last one saved before kickoff
 * (the database refuses changes after kickoff).
 */
export function callOutcome(
  call: Call,
  kickoffAt: string,
  game: { result: Outcome | null; result_status: string | null } | null,
  now: Date = new Date(),
): CallOutcome {
  if (now.getTime() < Date.parse(kickoffAt)) return "open";
  if (game?.result_status === "postponed") return "postponed";
  if (game?.result_status === "cancelled") return "cancelled";
  if (!game?.result) return "waiting";
  return game.result === call ? "called_it" : "not_this_time";
}

/** How many settled calls were right. Postponed, cancelled and unplayed games don't count. */
export function callRecord(outcomes: CallOutcome[]): { right: number; settled: number } {
  const settled = outcomes.filter((o) => o === "called_it" || o === "not_this_time");
  return { right: settled.filter((o) => o === "called_it").length, settled: settled.length };
}

/**
 * "When you went against Polymarket, you were right 3 of 11 times."
 * A call goes against a source when it isn't that source's most likely result before kickoff.
 * Only settled calls count, and only where we had that source's chances.
 */
export function againstRecord(
  calls: { call: Call; outcome: CallOutcome; favourite: Outcome | null }[],
): { right: number; total: number } {
  const against = calls.filter(
    (c) => c.favourite !== null && c.call !== c.favourite && (c.outcome === "called_it" || c.outcome === "not_this_time"),
  );
  return { right: against.filter((c) => c.outcome === "called_it").length, total: against.length };
}

export type YouVOdds = {
  /** Finished calls on games where the bookies and Polymarket rated the same result most likely. */
  calls: number;
  right: number;
  /** How many of those games the result the bookies and Polymarket rated most likely won. */
  oddsRight: number;
  /** The calls that went against that result. */
  against: { right: number; total: number };
};

/**
 * "You were right in 8 of your 14 calls. Picking what the bookies and Polymarket rated most likely every time
 * would have got 7." Only games where both sources rated the same result most likely count, so "what the odds
 * picked" is one clear result (on every game so far they have).
 */
export function youVOdds(
  calls: { call: Call; outcome: CallOutcome; result: Outcome | null; bookieFavourite: Outcome | null; polyFavourite: Outcome | null }[],
): YouVOdds {
  const counted = calls
    .filter((c) => (c.outcome === "called_it" || c.outcome === "not_this_time") && c.result && c.bookieFavourite && c.bookieFavourite === c.polyFavourite)
    .map((c) => ({ ...c, favourite: c.bookieFavourite }));
  return {
    calls: counted.length,
    right: counted.filter((c) => c.outcome === "called_it").length,
    oddsRight: counted.filter((c) => c.favourite === c.result).length,
    against: againstRecord(counted),
  };
}

const TIMES = ["you weren't right once", "you were right once", "you were right twice"];

/** The note above the call buttons, from 3 calls against the odds. Null below that. */
export function againstOddsNote(against: { right: number; total: number }): string | null {
  if (against.total < 3) return null;
  const right = TIMES[against.right] ?? `you were right ${against.right} times`;
  return `Last ${against.total} times you went against the odds, ${right}.`;
}

/** The one-line verdict under "Your gut v the odds". */
export function gutVerdict(right: number, oddsRight: number): string {
  const d = right - oddsRight;
  if (d === 0) return "Level. Your gut is matching the odds.";
  return d > 0 ? `Your gut is ${d} ahead of the odds.` : `The odds are ${-d} ahead of your gut.`;
}
