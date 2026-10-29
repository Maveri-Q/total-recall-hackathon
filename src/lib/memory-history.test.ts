import { describe, expect, it } from "vitest";
import type { Verdict } from "./data-job/memories";
import { historyText, scoreAt, scoreHistory, type GradedGame } from "./memory-history";

const v = (closer: Verdict["closer"], gapPoints: number): Verdict => ({ kind: "pre_kickoff", closer, gapPoints, bookieBrier: 0.3, polyBrier: 0.3 });
const g = (leagueCode: string, kickoffAt: string, closer: Verdict["closer"], gap: number): GradedGame => ({ leagueCode, kickoffAt, verdict: v(closer, gap) });

const games = [
  g("SA", "2026-10-06T19:00:00Z", "polymarket", 7), // 3+ weeks ago
  g("SA", "2026-10-20T19:00:00Z", "bookies", 12), // between 3 weeks and 1 week ago
  g("SA", "2026-10-27T19:00:00Z", "polymarket", 6), // this week
  g("SA", "2026-10-27T21:00:00Z", "bookies", 2), // small gap: never counted here
  g("PL", "2026-10-25T15:00:00Z", "tie", 9),
];
const now = new Date("2026-10-29T12:00:00Z");

describe("scoreAt", () => {
  it("counts only games 5+ points apart, up to the cut-off (hand-checked)", () => {
    expect(scoreAt(games, "SA")).toEqual({ bookies: 1, polymarket: 2, level: 0, games: 3 });
    expect(scoreAt(games, "SA", new Date("2026-10-22T12:00:00Z"))).toEqual({ bookies: 1, polymarket: 1, level: 0, games: 2 });
    expect(scoreAt(games, "PL")).toEqual({ bookies: 0, polymarket: 0, level: 1, games: 1 });
  });
});

describe("scoreHistory", () => {
  it("shows now, last week and three weeks ago per league, busiest league first", () => {
    const h = scoreHistory(games, now);
    expect(h.map((x) => x.leagueCode)).toEqual(["SA", "PL"]);
    expect(historyText(h[0])).toBe("3 weeks ago 0-1, last week 1-1, now 1-2");
  });

  it("leaves out points from before our first graded game", () => {
    const h = scoreHistory([g("SA", "2026-10-27T19:00:00Z", "polymarket", 6)], now);
    expect(h[0].lastWeek).toBeNull();
    expect(h[0].threeWeeksAgo).toBeNull();
    expect(historyText(h[0])).toBe("Now 0-1");
  });

  it("is empty with no graded games", () => {
    expect(scoreHistory([], now)).toEqual([]);
  });
});
