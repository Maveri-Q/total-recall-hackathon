import { describe, expect, it } from "vitest";
import { chunk, hashToBytes, mistToSui, refToBytes } from "./sui-stamp";

describe("hashToBytes", () => {
  it("turns a 64-character hex hash into 32 bytes", () => {
    const bytes = hashToBytes("00ff" + "a".repeat(60));
    expect(bytes.length).toBe(32);
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(255);
    expect(bytes[2]).toBe(0xaa);
  });

  it("rejects anything that isn't a sha256 hex hash", () => {
    expect(() => hashToBytes("abc")).toThrow();
    expect(() => hashToBytes("A".repeat(64))).toThrow();
    expect(() => hashToBytes("g".repeat(64))).toThrow();
  });
});

describe("refToBytes", () => {
  it("accepts a UUID and rejects long refs", () => {
    expect(refToBytes("6f1c2a3e-1111-4222-8333-944455556666").length).toBe(36);
    expect(() => refToBytes("x".repeat(65))).toThrow();
  });
});

describe("chunk", () => {
  it("splits into batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe("mistToSui", () => {
  it("formats MIST as SUI with 4 decimals", () => {
    expect(mistToSui(1_500_000_000n)).toBe("1.5000");
    expect(mistToSui(2_345_678n)).toBe("0.0023");
  });
});
