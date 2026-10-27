import { describe, expect, it } from "vitest";
import { bookieConsensus, buildReading, type BookiePrice, type MatchRef, type PolyPrices } from "./reading";

const match: MatchRef = {
  oddsApiId: "abc123",
  leagueCode: "PL",
  homeTeam: "Chelsea",
  awayTeam: "Manchester United",
  kickoffAt: "2026-10-31T12:30:00Z",
};
const book = (key: string, home: number, draw: number, away: number): BookiePrice => ({
  key,
  title: key,
  last_update: "2026-10-31T09:00:00Z",
  home,
  draw,
  away,
});
const bookies = [book("a", 2, 3.5, 4), book("b", 2.1, 3.4, 3.8), book("c", 1.5, 4, 7)];
const poly: PolyPrices = {
  eventId: "1209076",
  fetchedAt: "2026-10-31T09:31:00Z",
  volume: 25_000,
  yes: { home: 0.55, draw: 0.25, away: 0.25 },
};

describe("bookieConsensus", () => {
  it("takes the median margin-free chance and scales to 100%", () => {
    const c = bookieConsensus(bookies)!;
    expect(c.home + c.draw + c.away).toBeCloseTo(1, 10);
    // Bookie "a" alone is 48.3 / 27.6 / 24.1. The median should sit near it, not near outlier "c".
    expect(c.home).toBeGreaterThan(0.45);
    expect(c.home).toBeLessThan(0.5);
  });

  it("skips bookies with impossible odds and returns null with none left", () => {
    expect(bookieConsensus([book("x", 1, 3, 3)])).toBeNull();
    expect(bookieConsensus([])).toBeNull();
  });
});

describe("buildReading", () => {
  it("marks a reading usable when both sources are present, in sync and the market has volume", () => {
    const r = buildReading(match, "pre_kickoff", "2026-10-31T09:30:00Z", bookies, poly);
    expect(r.poly_status).toBe("ok");
    expect(r.in_sync).toBe(true);
    expect(r.usable).toBe(true);
    expect(r.poly_home! + r.poly_draw! + r.poly_away!).toBeCloseTo(1, 10);
    expect(r.content_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("labels thin markets, missing markets and out-of-sync fetches, and leaves them out", () => {
    expect(buildReading(match, "pre_kickoff", "2026-10-31T09:30:00Z", bookies, { ...poly, volume: 9_999 })).toMatchObject({
      poly_status: "thin_market",
      usable: false,
    });
    expect(buildReading(match, "pre_kickoff", "2026-10-31T09:30:00Z", bookies, null)).toMatchObject({
      poly_status: "not_found",
      in_sync: false,
      usable: false,
    });
    expect(buildReading(match, "pre_kickoff", "2026-10-31T09:20:00Z", bookies, poly)).toMatchObject({
      in_sync: false,
      usable: false,
    });
  });

  it("gives the same hash for the same data, whatever order the bookies came in", () => {
    const a = buildReading(match, "day_before", "2026-10-31T09:30:00Z", bookies, poly);
    const b = buildReading(match, "day_before", "2026-10-31T09:30:00Z", [...bookies].reverse(), poly);
    const c = buildReading(match, "pre_kickoff", "2026-10-31T09:30:00Z", bookies, poly);
    expect(a.content_hash).toBe(b.content_hash);
    expect(a.content_hash).not.toBe(c.content_hash);
  });
});
