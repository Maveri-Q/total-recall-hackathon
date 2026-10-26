import { describe, expect, it } from "vitest";
import { impliedProbability } from "./odds";

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
