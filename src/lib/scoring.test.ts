import { describe, expect, it } from "vitest";
import { brierScore, closerSource, resultFromScore } from "./scoring";

describe("brierScore (hand-checked)", () => {
  it("scores a perfect forecast 0 and the worst possible 2", () => {
    expect(brierScore({ home: 1, draw: 0, away: 0 }, "home")).toBe(0);
    expect(brierScore({ home: 1, draw: 0, away: 0 }, "away")).toBe(2);
  });

  it("scores a typical forecast", () => {
    // Home won. (0.5-1)² + (0.3-0)² + (0.2-0)² = 0.25 + 0.09 + 0.04 = 0.38
    expect(brierScore({ home: 0.5, draw: 0.3, away: 0.2 }, "home")).toBeCloseTo(0.38, 10);
    // Draw. (0.5-0)² + (0.3-1)² + (0.2-0)² = 0.25 + 0.49 + 0.04 = 0.78
    expect(brierScore({ home: 0.5, draw: 0.3, away: 0.2 }, "draw")).toBeCloseTo(0.78, 10);
  });
});

describe("closerSource", () => {
  const bookies = { name: "bookies" as const, chances: { home: 0.55, draw: 0.25, away: 0.2 } };
  const poly = { name: "polymarket" as const, chances: { home: 0.68, draw: 0.2, away: 0.12 } };

  it("picks the source that gave the actual result a higher, better-spread chance", () => {
    // Home won. Bookies: 0.2025 + 0.0625 + 0.04 = 0.305. Polymarket: 0.1024 + 0.04 + 0.0144 = 0.1568.
    const r = closerSource(bookies, poly, "home");
    expect(r.winner).toBe("polymarket");
    expect(r.scores.bookies).toBeCloseTo(0.305, 10);
    expect(r.scores.polymarket).toBeCloseTo(0.1568, 10);
  });

  it("flips when the underdog wins", () => {
    expect(closerSource(bookies, poly, "away").winner).toBe("bookies");
  });

  it("calls a tie when the scores are the same", () => {
    expect(closerSource(bookies, { name: "polymarket" as const, chances: bookies.chances }, "draw").winner).toBe("tie");
  });
});

describe("resultFromScore", () => {
  it("reads the full-time score", () => {
    expect(resultFromScore(2, 1)).toBe("home");
    expect(resultFromScore(0, 0)).toBe("draw");
    expect(resultFromScore(1, 3)).toBe("away");
  });
});
