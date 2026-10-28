import { describe, expect, it } from "vitest";
import type { ReadingRow } from "./data-job/memories";
import { favourite, headline, scoreline, type PastGame } from "./scoreline";

// A usable pre-kickoff reading with the given gap (points on home) and winner.
function reading(gapPoints: number, closer: "bookies" | "polymarket" | "tie", usable = true): ReadingRow {
  const home = 0.5;
  return {
    id: "r",
    kind: "pre_kickoff",
    odds_fetched_at: "2026-10-27T15:00:00Z",
    bookie_count: 20,
    bookie_home: home, bookie_draw: 0.25, bookie_away: 0.25,
    poly_status: "ok",
    poly_volume: 50000,
    poly_home: home + gapPoints / 100, poly_draw: 0.25 - gapPoints / 200, poly_away: 0.25 - gapPoints / 200,
    in_sync: true,
    usable,
    content_hash: "a".repeat(64),
    sui_digest: null,
    bookie_brier: 0.3, poly_brier: 0.3,
    closer: usable ? closer : null,
  };
}
const game = (matchId: string, leagueCode: string, gap: number, closer: "bookies" | "polymarket" | "tie", usable = true): PastGame => ({
  matchId, leagueCode, readings: [reading(gap, closer, usable)],
});

describe("scoreline", () => {
  it("counts only same-league games with the same size of gap (hand-checked)", () => {
    const recalled = [
      game("a", "SA", 7, "polymarket"),
      game("b", "SA", 6, "bookies"),
      game("c", "SA", 9.5, "polymarket"),
      game("d", "SA", 8, "tie"),
      game("e", "PL", 7, "bookies"), // other league
      game("f", "SA", 2, "bookies"), // small gap
      game("g", "SA", 12, "bookies"), // big gap
      game("h", "SA", 7, "bookies", false), // not usable
    ];
    expect(scoreline(recalled, "SA", "medium")).toEqual({
      bookies: 1, polymarket: 2, level: 1, games: 4, counted: ["a", "b", "c", "d"],
    });
  });

  it("counts a game once even if Walrus returns it twice", () => {
    const s = scoreline([game("a", "SA", 2, "polymarket"), game("a", "SA", 2, "polymarket")], "SA", "small");
    expect(s.games).toBe(1);
  });

  it("is empty when nothing matches", () => {
    expect(scoreline([], "SA", "big")).toEqual({ bookies: 0, polymarket: 0, level: 0, games: 0, counted: [] });
  });
});

describe("headline", () => {
  it("picks the result they disagree on most, as in Roma 58% v 66%", () => {
    const h = headline({ home: 0.58, draw: 0.24, away: 0.18 }, { home: 0.66, draw: 0.2, away: 0.14 });
    expect(h.outcome).toBe("home");
    expect(h.bookies).toBe(0.58);
    expect(h.poly).toBe(0.66);
    expect(h.band).toBe("medium"); // 8 points
  });
});

describe("favourite", () => {
  it("is the result with the highest chance", () => {
    expect(favourite({ home: 0.2, draw: 0.3, away: 0.5 })).toBe("away");
  });
});
