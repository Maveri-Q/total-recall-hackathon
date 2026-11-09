import { describe, expect, it } from "vitest";
import type { ReadingRow } from "./data-job/memories";
import { breakReturn, recentResults, resultsTally, type GradedMatch } from "./recent-results";

function reading(kind: ReadingRow["kind"], over: Partial<ReadingRow> = {}): ReadingRow {
  return {
    id: `r-${kind}`,
    kind,
    odds_fetched_at: "2026-11-06T12:00:00Z",
    bookie_count: 20,
    bookie_home: 0.5,
    bookie_draw: 0.3,
    bookie_away: 0.2,
    poly_status: "ok",
    poly_volume: 50_000,
    poly_home: 0.52,
    poly_draw: 0.28,
    poly_away: 0.2,
    in_sync: true,
    usable: true,
    content_hash: "ab",
    sui_digest: null,
    bookie_brier: 0.38,
    poly_brier: 0.3632,
    closer: "polymarket",
    ...over,
  };
}

const game = (id: string, kickoffAt: string, readings: ReadingRow[], goals: [number, number] = [2, 1]): GradedMatch => ({
  id,
  leagueName: "Serie A",
  homeTeam: "Inter",
  awayTeam: "Como",
  kickoffAt,
  homeGoals: goals[0],
  awayGoals: goals[1],
  readings,
});

describe("recentResults", () => {
  it("gives each source's chance for what happened, from the reading that counts", () => {
    const [g] = recentResults([game("a", "2026-11-06T19:45:00Z", [reading("pre_kickoff"), reading("day_before", { closer: "bookies" })])]);
    expect(g).toMatchObject({ result: "home", bookies: 50, poly: 52, closer: "polymarket" });
    const [draw] = recentResults([game("b", "2026-11-06T19:45:00Z", [reading("pre_kickoff")], [1, 1])]);
    expect(draw).toMatchObject({ result: "draw", bookies: 30, poly: 28 });
  });

  it("falls back to the day-before reading, and skips games with no usable reading", () => {
    const games = recentResults([
      game("a", "2026-11-06T19:45:00Z", [reading("pre_kickoff", { usable: false, closer: null }), reading("day_before", { closer: "tie" })]),
      game("b", "2026-11-06T19:45:00Z", [reading("pre_kickoff", { usable: false, closer: null, poly_status: "unavailable" })]),
    ]);
    expect(games.map((g) => [g.id, g.closer])).toEqual([["a", "tie"]]);
  });

  it("keeps the latest 7 days that have graded games, newest first", () => {
    const games = recentResults([
      game("old", "2026-10-28T19:45:00Z", [reading("pre_kickoff")]),
      game("mid", "2026-11-01T14:00:00Z", [reading("pre_kickoff")]),
      game("new", "2026-11-06T19:45:00Z", [reading("pre_kickoff")]),
    ]);
    expect(games.map((g) => g.id)).toEqual(["new", "mid"]);
  });

  it("counts who was closer", () => {
    const games = recentResults([
      game("a", "2026-11-06T19:45:00Z", [reading("pre_kickoff")]),
      game("b", "2026-11-06T19:45:00Z", [reading("pre_kickoff", { closer: "tie" })]),
      game("c", "2026-11-05T19:45:00Z", [reading("pre_kickoff", { closer: "tie" })]),
    ]);
    expect(resultsTally(games)).toEqual({ bookies: 0, polymarket: 1, tooClose: 2 });
  });
});

describe("breakReturn", () => {
  const now = Date.parse("2026-11-09T21:00:00Z");
  it("names the first game when it's 4 or more days away", () => {
    expect(breakReturn(["2026-11-22T14:00:00Z", "2026-11-21T12:30:00Z"], now)?.toISOString()).toBe("2026-11-21T12:30:00.000Z");
  });
  it("no break line when a game is coming up soon, or when there are no games at all", () => {
    expect(breakReturn(["2026-11-12T19:45:00Z", "2026-11-21T12:30:00Z"], now)).toBeNull();
    expect(breakReturn([], now)).toBeNull();
  });
});
