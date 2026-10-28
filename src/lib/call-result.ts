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
