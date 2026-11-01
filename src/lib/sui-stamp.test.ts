import { describe, expect, it } from "vitest";
import { canStamp, stampedBeforeKickoff, chunk, hashToBytes, isOutOfGas, mistToSui, refToBytes, stampsLeft } from "./sui-stamp";

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

describe("the app wallet and gas", () => {
  it("can stamp only while it holds the 0.005 SUI gas limit", () => {
    expect(canStamp(5_000_000n)).toBe(true);
    expect(canStamp(4_999_999n)).toBe(false);
    expect(canStamp(0n)).toBe(false);
  });

  it("estimates stamps left at the measured 0.0001 SUI each", () => {
    expect(stampsLeft(5_487_207_101n)).toBe(54_872); // the balance on 1 Nov 2026
    expect(stampsLeft(1_000_000n)).toBe(0); // below the gas limit, nothing can be stamped
  });

  it("tells an empty wallet apart from other failures", () => {
    expect(isOutOfGas(new Error("No valid gas coins found for the transaction."))).toBe(true);
    expect(isOutOfGas(new Error("Balance of gas object 0xabc is lower than the needed amount: 5000000"))).toBe(true);
    expect(isOutOfGas(new Error("Sui rejected the stamp transaction: InsufficientGas"))).toBe(true);
    expect(isOutOfGas(new Error("read ECONNRESET"))).toBe(false);
    expect(isOutOfGas(new Error("Move abort: EBadHashLength"))).toBe(false);
  });
});

describe("stampedBeforeKickoff", () => {
  it("counts a stamp only if Sui recorded it before kickoff", () => {
    expect(stampedBeforeKickoff("2026-10-31T09:18:55Z", "2026-10-31T12:30:00Z")).toBe(true);
    expect(stampedBeforeKickoff("2026-10-28T02:31:18Z", "2026-10-27T17:30:00Z")).toBe(false); // our first 11, stamped late
    expect(stampedBeforeKickoff("2026-10-31T12:30:00Z", "2026-10-31T12:30:00Z")).toBe(false);
  });
});
