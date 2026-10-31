import { describe, expect, it } from "vitest";
import { biggestGap, bookmakerMargin, chancesFromOdds, chancesFromPrices, impliedProbability, normalise, wholePercents } from "./odds";

describe("impliedProbability", () => {
  it("turns decimal odds into a percentage", () => {
    expect(impliedProbability(2)).toBe(50);
    expect(impliedProbability(4)).toBe(25);
    expect(impliedProbability(1.8)).toBeCloseTo(55.56, 2);
  });

  it("returns null for odds that can't be real", () => {
    expect(impliedProbability(1)).toBeNull();
    expect(impliedProbability(0)).toBeNull();
    expect(impliedProbability(-3)).toBeNull();
    expect(impliedProbability(NaN)).toBeNull();
    expect(impliedProbability(null)).toBeNull();
    expect(impliedProbability(undefined)).toBeNull();
  });
});

describe("chancesFromOdds", () => {
  it("removes the bookie margin (hand-checked)", () => {
    // 1/2 + 1/3.5 + 1/4 = 0.5 + 0.285714 + 0.25 = 1.035714, so the margin is 3.57%.
    const odds = { home: 2, draw: 3.5, away: 4 };
    expect(bookmakerMargin(odds)).toBeCloseTo(0.035714, 5);
    const c = chancesFromOdds(odds)!;
    expect(c.home).toBeCloseTo(0.5 / 1.035714, 5); // 48.28%
    expect(c.draw).toBeCloseTo(0.285714 / 1.035714, 5); // 27.59%
    expect(c.away).toBeCloseTo(0.25 / 1.035714, 5); // 24.14%
    expect(c.home + c.draw + c.away).toBeCloseTo(1, 10);
  });

  it("returns null if any price is bad", () => {
    expect(chancesFromOdds({ home: 2, draw: 1, away: 4 })).toBeNull();
    expect(chancesFromOdds({ home: 2, draw: NaN, away: 4 })).toBeNull();
  });
});

describe("chancesFromPrices", () => {
  it("normalises Polymarket Yes prices that don't add to 1 (hand-checked)", () => {
    // 0.55 + 0.25 + 0.25 = 1.05
    const c = chancesFromPrices({ home: 0.55, draw: 0.25, away: 0.25 })!;
    expect(c.home).toBeCloseTo(0.5238, 4);
    expect(c.draw).toBeCloseTo(0.2381, 4);
    expect(c.away).toBeCloseTo(0.2381, 4);
  });

  it("rejects prices outside 0 to 1 and all-zero prices", () => {
    expect(chancesFromPrices({ home: 1.2, draw: 0.1, away: 0.1 })).toBeNull();
    expect(chancesFromPrices({ home: 0, draw: 0, away: 0 })).toBeNull();
  });
});

describe("normalise", () => {
  it("returns null when a value is missing", () => {
    expect(normalise({ home: 0.5, draw: null, away: 0.3 })).toBeNull();
  });
});

describe("biggestGap", () => {
  it("finds the outcome where two sources disagree most, in points", () => {
    const bookies = { home: 0.55, draw: 0.25, away: 0.2 };
    const poly = { home: 0.68, draw: 0.2, away: 0.12 };
    const gap = biggestGap(bookies, poly);
    expect(gap.outcome).toBe("home");
    expect(gap.points).toBeCloseTo(13, 6);
  });
});

describe("wholePercents", () => {
  it("adds up to exactly 100 where plain rounding gives 101", () => {
    const c = { home: 0.525, draw: 0.245, away: 0.23 }; // plain rounding: 53 + 25 + 23 = 101
    const p = wholePercents(c);
    expect(p.home + p.draw + p.away).toBe(100);
    expect(p).toEqual({ home: 53, draw: 24, away: 23 });
  });

  it("adds up to exactly 100 where plain rounding gives 99", () => {
    const p = wholePercents({ home: 0.334, draw: 0.333, away: 0.333 }); // plain: 33 + 33 + 33 = 99
    expect(p).toEqual({ home: 34, draw: 33, away: 33 });
  });

  it("leaves numbers that already add up alone", () => {
    expect(wholePercents({ home: 0.48, draw: 0.27, away: 0.25 })).toEqual({ home: 48, draw: 27, away: 25 });
  });
});
