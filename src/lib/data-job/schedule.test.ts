import { describe, expect, it } from "vitest";
import { dueReadings, firstReadingAt, inSync } from "./schedule";

const at = (iso: string) => new Date(iso);
const kickoff = "2026-10-31T15:00:00Z";

describe("dueReadings", () => {
  it("takes the day-before reading from 06:00 UTC when kickoff is 4 to 24 hours away", () => {
    expect(dueReadings(kickoff, [], at("2026-10-31T06:17:00Z"), 400)).toEqual(["day_before"]);
    expect(dueReadings(kickoff, [], at("2026-10-31T05:17:00Z"), 400)).toEqual([]); // before 06:00
    expect(dueReadings(kickoff, [], at("2026-10-30T14:17:00Z"), 400)).toEqual([]); // more than 24h away
  });

  it("takes the pre-kickoff reading 1 to 4 hours before kickoff", () => {
    expect(dueReadings(kickoff, ["day_before"], at("2026-10-31T11:17:00Z"), 400)).toEqual(["pre_kickoff"]);
    expect(dueReadings(kickoff, ["day_before"], at("2026-10-31T13:59:00Z"), 400)).toEqual(["pre_kickoff"]);
    expect(dueReadings(kickoff, ["day_before"], at("2026-10-31T14:17:00Z"), 400)).toEqual([]); // under 1h
  });

  it("never takes the same reading twice", () => {
    expect(dueReadings(kickoff, ["day_before", "pre_kickoff"], at("2026-10-31T12:17:00Z"), 400)).toEqual([]);
    expect(dueReadings(kickoff, ["day_before"], at("2026-10-31T08:17:00Z"), 400)).toEqual([]);
  });

  it("skips the day-before reading when it's already close to kickoff", () => {
    expect(dueReadings(kickoff, [], at("2026-10-31T12:17:00Z"), 400)).toEqual(["pre_kickoff"]);
  });

  it("skips pre-kickoff readings when credits are low, but keeps day-before ones", () => {
    expect(dueReadings(kickoff, ["day_before"], at("2026-10-31T12:17:00Z"), 59)).toEqual([]);
    expect(dueReadings(kickoff, [], at("2026-10-31T06:17:00Z"), 59)).toEqual(["day_before"]);
  });

  it("never reads a match that has started", () => {
    expect(dueReadings(kickoff, [], at("2026-10-31T15:30:00Z"), 400)).toEqual([]);
  });
});

describe("inSync", () => {
  it("allows up to 5 minutes between the two fetches", () => {
    expect(inSync("2026-10-31T12:00:00Z", "2026-10-31T12:05:00Z")).toBe(true);
    expect(inSync("2026-10-31T12:00:00Z", "2026-10-31T12:05:01Z")).toBe(false);
    expect(inSync("2026-10-31T12:00:00Z", null)).toBe(false);
  });
});

describe("firstReadingAt", () => {
  it("is the first run once kickoff is 24 hours away", () => {
    // Villarreal v Espanyol, Fri 30 Oct 20:00 UTC: the 20:17 run on Thursday.
    expect(firstReadingAt("2026-10-30T20:00:00Z").toISOString()).toBe("2026-10-29T20:17:00.000Z");
  });
  it("waits for 06:00 UTC when 24 hours before is earlier in the night", () => {
    expect(firstReadingAt("2026-10-31T03:00:00Z").toISOString()).toBe("2026-10-30T06:17:00.000Z");
  });
  it("rounds up to the next run at :17", () => {
    expect(firstReadingAt("2026-10-31T12:30:00Z").toISOString()).toBe("2026-10-30T13:17:00.000Z");
  });
  it("matches dueReadings: that run really takes a reading", () => {
    for (const k of ["2026-10-30T20:00:00Z", "2026-10-31T03:00:00Z", "2026-10-31T12:30:00Z", "2026-11-01T00:15:00Z"]) {
      expect(dueReadings(k, [], firstReadingAt(k), 400).length).toBeGreaterThan(0);
    }
  });
});
