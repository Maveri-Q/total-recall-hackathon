import { describe, expect, it } from "vitest";
import { tickerFact, tickerLines, type TickerGame, type TickerResult } from "./ticker";

const now = new Date("2026-10-30T10:00:00Z");
const game = (over: Partial<TickerGame>): TickerGame => ({
  id: "m",
  kickoffAt: "2026-10-31T12:30:00Z",
  home: "Chelsea",
  away: "Man United",
  bookies: { home: 0.48, draw: 0.27, away: 0.25 },
  poly: { home: 0.6, draw: 0.22, away: 0.18 },
  gap: { outcome: "home", points: 12, polyHigher: true },
  ...over,
});

describe("tickerLines", () => {
  it("puts the biggest gaps first, then agreements, then games waiting for odds, then results", () => {
    const games = [
      game({ id: "agree", gap: { outcome: "home", points: 1.2, polyHigher: true } }),
      game({ id: "small-gap", gap: { outcome: "away", points: 6, polyHigher: false } }),
      game({ id: "big-gap" }),
      game({ id: "no-odds", bookies: null, poly: null, gap: null }),
    ];
    const results: TickerResult[] = [{ home: "Fiorentina", away: "Atalanta", homeGoals: 2, awayGoals: 2, kickoffAt: "2026-10-29T19:45:00Z", closer: "tie" }];
    const lines = tickerLines(games, results, now);
    expect(lines.map((l) => ("matchId" in l ? l.matchId : l.kind))).toEqual(["big-gap", "small-gap", "agree", "no-odds", "result"]);
  });

  it("leaves out games that have kicked off and games with bookies but no Polymarket", () => {
    const lines = tickerLines([game({ kickoffAt: "2026-10-30T09:00:00Z" }), game({ id: "bookies-only", poly: null, gap: null })], [], now);
    expect(lines).toEqual([]);
  });

  it("rounds the gap and names who rates it higher", () => {
    const [line] = tickerLines([game({ gap: { outcome: "draw", points: 7.6, polyHigher: false } })], [], now);
    expect(tickerFact(line)).toBe("Bookies rate a draw 8 pts higher");
  });
});

describe("tickerFact", () => {
  it("says it plainly for each kind of line", () => {
    const [gap] = tickerLines([game({})], [], now);
    expect(tickerFact(gap)).toBe("Polymarket rates Chelsea 12 pts higher");
    const [agree] = tickerLines([game({ gap: { outcome: "home", points: 2, polyHigher: true } })], [], now);
    expect(tickerFact(agree)).toBe("Both make Chelsea favourites");
    expect(tickerFact({ kind: "due", matchId: "x", home: "Nice", away: "Rennes", at: "" }, "Fri 1:17pm")).toBe("Odds land Fri 1:17pm");
    expect(tickerFact({ kind: "result", home: "A", away: "B", score: "1-0", closer: "polymarket" })).toBe("FT 1-0. Polymarket got closer");
    expect(tickerFact({ kind: "result", home: "A", away: "B", score: "2-2", closer: "tie" })).toBe("FT 2-2. Dead heat");
  });
});
