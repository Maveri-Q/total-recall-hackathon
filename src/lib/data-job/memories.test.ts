import { describe, expect, it } from "vitest";
import {
  gapBand,
  matchResultMemoryText,
  matchVerdict,
  readingMemoryText,
  sourceRecord,
  sourceRecordMemoryText,
  type ReadingRow,
  type Verdict,
} from "./memories";

// Real reading: Sassuolo v Lazio, pre-kickoff, 27 Oct 2026.
const match = { leagueName: "Serie A", homeTeam: "Sassuolo", awayTeam: "Lazio", kickoffAt: "2026-10-27T17:30:00+00:00" };
const pre: ReadingRow = {
  id: "r1",
  kind: "pre_kickoff",
  odds_fetched_at: "2026-10-27T15:54:00+00:00",
  bookie_count: 21,
  bookie_home: "0.271", bookie_draw: "0.269", bookie_away: "0.46",
  poly_status: "ok",
  poly_volume: "112291",
  poly_home: "0.256", poly_draw: "0.266", poly_away: "0.477",
  in_sync: true,
  usable: true,
  content_hash: "a".repeat(64),
  sui_digest: "5cuZ4iPqHRDHPwqad4ggBb7DX7V82kBnj3Gc4kFpnHoC",
  bookie_brier: "0.4379", poly_brier: "0.4097", closer: "polymarket",
};
const dayBefore: ReadingRow = { ...pre, id: "r2", kind: "day_before", poly_status: "thin_market", poly_volume: "9015", usable: false, closer: null };

describe("gapBand", () => {
  it("splits at 5 and 10 points", () => {
    expect(gapBand(4.99)).toBe("small");
    expect(gapBand(5)).toBe("medium");
    expect(gapBand(9.99)).toBe("medium");
    expect(gapBand(10)).toBe("big");
  });
});

describe("readingMemoryText", () => {
  it("says what each source gave, the gap, and the Sui stamp", () => {
    const text = readingMemoryText(match, pre);
    expect(text).toContain("Odds reading for Sassuolo v Lazio (Serie A), kickoff Tue 27 Oct 2026 17:30 UTC.");
    expect(text).toContain("Pre-kickoff reading, taken 1h 36m before kickoff.");
    expect(text).toContain("Bookies (middle of 21): Sassuolo 27.1%, draw 26.9%, Lazio 46.0%.");
    expect(text).toContain("Polymarket ($112,291 traded): Sassuolo 25.6%, draw 26.6%, Lazio 47.7%.");
    expect(text).toContain("Biggest gap: Lazio, Polymarket 1.7 points higher, a small gap (under 5 points).");
    expect(text).toContain("transaction 5cuZ4iPqHRDHPwqad4ggBb7DX7V82kBnj3Gc4kFpnHoC");
  });

  it("explains why a thin market doesn't count", () => {
    expect(readingMemoryText(match, dayBefore)).toContain("Won't count towards source records: Polymarket market too thin ($9,015 traded).");
  });

  it("says plainly when Polymarket has no market", () => {
    const none = { ...dayBefore, poly_status: "not_found" as const, poly_volume: null, poly_home: null, poly_draw: null, poly_away: null };
    const text = readingMemoryText(match, none);
    expect(text).toContain("Polymarket: no market for this match.");
    expect(text).not.toContain("Biggest gap");
  });
});

describe("matchVerdict", () => {
  it("uses the pre-kickoff reading when it's usable", () => {
    expect(matchVerdict([dayBefore, pre])).toMatchObject({ kind: "pre_kickoff", closer: "polymarket", bookieBrier: 0.4379 });
  });

  it("falls back to a usable day-before reading", () => {
    const usableDay = { ...dayBefore, usable: true, closer: "bookies" as const };
    const unusablePre = { ...pre, usable: false, closer: null };
    expect(matchVerdict([usableDay, unusablePre])?.kind).toBe("day_before");
  });

  it("gives nothing when no reading is usable", () => {
    expect(matchVerdict([dayBefore])).toBeNull();
  });
});

describe("matchResultMemoryText", () => {
  it("tells the story of a graded match", () => {
    const text = matchResultMemoryText(match, { homeGoals: 2, awayGoals: 6, result: "away" }, [pre, dayBefore]);
    expect(text).toContain("Graded match: Sassuolo 2-6 Lazio (Serie A, Tue 27 Oct 2026). Result after 90 minutes: Lazio win.");
    expect(text).toContain("Pre-kickoff reading: bookies gave Lazio 46.0%, Polymarket 47.7%.");
    expect(text).toContain("Brier score, lower is better: bookies 0.438, Polymarket 0.410. Polymarket was closer.");
    expect(text).toContain("Not counted: Polymarket market too thin ($9,015 traded).");
    expect(text).toContain("counts once in the Serie A source record, using the pre-kickoff reading.");
  });
});

describe("sourceRecord", () => {
  const v = (closer: Verdict["closer"], gapPoints: number, bookieBrier: number, polyBrier: number): Verdict => ({
    kind: "pre_kickoff", closer, gapPoints, bookieBrier, polyBrier,
  });

  it("counts who was closer, overall and by gap size (hand-checked)", () => {
    const rec = sourceRecord([v("polymarket", 1.7, 0.4, 0.3), v("bookies", 12, 0.2, 0.5), v("tie", 6, 0.6, 0.6)]);
    expect(rec).toMatchObject({ matches: 3, polymarket: 1, bookies: 1, ties: 1 });
    expect(rec.avgBookieBrier).toBeCloseTo(0.4, 10); // (0.4 + 0.2 + 0.6) / 3
    expect(rec.avgPolyBrier).toBeCloseTo(0.4667, 4); // (0.3 + 0.5 + 0.6) / 3
    expect(rec.byBand.small).toEqual({ matches: 1, polymarket: 1, bookies: 0, ties: 0 });
    expect(rec.byBand.medium).toEqual({ matches: 1, polymarket: 0, bookies: 0, ties: 1 });
    expect(rec.byBand.big).toEqual({ matches: 1, polymarket: 0, bookies: 1, ties: 0 });
  });

  it("writes the record with its sample size and an early-signal label", () => {
    const text = sourceRecordMemoryText("Serie A", sourceRecord([v("polymarket", 1.7, 0.4379, 0.4097)]), "2026-10-28T03:00:00Z");
    expect(text).toContain("Source record, Serie A, after 1 graded match (to Wed 28 Oct 2026).");
    expect(text).toContain("Polymarket was closer in 1, the bookies in 0, level in 0.");
    expect(text).toContain("small gap (under 5 points): 1 match, Polymarket closer 1, bookies 0, level 0");
    expect(text).toContain("Early signal only: fewer than 10 matches.");
  });

  it("drops the early-signal label at 10 matches", () => {
    const ten = Array.from({ length: 10 }, () => v("bookies", 3, 0.3, 0.4));
    expect(sourceRecordMemoryText("all leagues", sourceRecord(ten), "2026-11-08T00:00:00Z")).not.toContain("Early signal");
  });
});
