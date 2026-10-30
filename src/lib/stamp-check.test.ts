import { bcs } from "@mysten/sui/bcs";
import { describe, expect, it } from "vitest";
import { commitmentHash } from "./commitment";
import { buildReading } from "./data-job/reading";
import { callFingerprint, decodeStamped, readingFingerprint } from "./stamp-check";

const match = { oddsApiId: "ev1", leagueCode: "PL", homeTeam: "Chelsea", awayTeam: "Manchester United", kickoffAt: "2026-10-31T12:30:00Z" };
const bookies = [{ key: "sport888", title: "888sport", last_update: "2026-10-31T09:15:00Z", home: 2.0, draw: 3.6, away: 3.9 }];
const poly = { eventId: "pm1", fetchedAt: "2026-10-31T09:17:04.512Z", volume: 251_000, yes: { home: 0.52, draw: 0.25, away: 0.23 } };

describe("readingFingerprint", () => {
  it("rebuilds the hash from the row as the database returns it (times as +00:00)", () => {
    const made = buildReading(match, "pre_kickoff", "2026-10-31T09:17:02.104Z", bookies, poly);
    const saved = {
      kind: "pre_kickoff" as const,
      odds_fetched_at: "2026-10-31T09:17:02.104+00:00",
      bookies,
      poly_fetched_at: "2026-10-31T09:17:04.512+00:00",
      poly_volume: "251000",
      poly_yes_home: 0.52,
      poly_yes_draw: 0.25,
      poly_yes_away: 0.23,
    };
    const row = { odds_api_id: "ev1", league_code: "PL", home_team: "Chelsea", away_team: "Manchester United", kickoff_at: "2026-10-31T12:30:00+00:00", polymarket_event_id: "pm1" };
    expect(readingFingerprint(saved, row)).toBe(made.content_hash);
  });

  it("spots a change: one bookie price edited after the stamp", () => {
    const made = buildReading(match, "pre_kickoff", "2026-10-31T09:17:02.104Z", bookies, null);
    const edited = { kind: "pre_kickoff" as const, odds_fetched_at: "2026-10-31T09:17:02.104Z", bookies: [{ ...bookies[0], home: 2.1 }], poly_fetched_at: null, poly_volume: null, poly_yes_home: null, poly_yes_draw: null, poly_yes_away: null };
    const row = { odds_api_id: "ev1", league_code: "PL", home_team: "Chelsea", away_team: "Manchester United", kickoff_at: match.kickoffAt, polymarket_event_id: null };
    expect(readingFingerprint(edited, row)).not.toBe(made.content_hash);
  });
});

describe("callFingerprint", () => {
  it("rebuilds the same hash makeCall stamped", () => {
    const fields = { predictionId: "p1", version: 2, homeTeam: "Roma", awayTeam: "Cagliari", league: "Serie A", kickoffAt: "2026-11-01T19:45:00Z", pick: "home" as const, confidence: null, reason: null, source: null };
    const saved = {
      prediction: { id: "p1", home_team: "Roma", away_team: "Cagliari", league: "Serie A", kickoff_at: "2026-11-01T19:45:00+00:00" },
      version: { version: 2, pick: "home" as const, confidence: null, reason: null, source: null },
    };
    expect(callFingerprint(saved)).toBe(commitmentHash(fields));
  });
});

describe("decodeStamped", () => {
  it("reads the Move event's fields", () => {
    const Stamped = bcs.struct("Stamped", { kind: bcs.u8(), hash: bcs.vector(bcs.u8()), ref_id: bcs.vector(bcs.u8()), timestamp_ms: bcs.u64(), recorder: bcs.Address });
    const hash = "ab".repeat(32);
    const recorder = "0x6d7a28ce3c59ebe4596e2d13ac7872b2ef9a828945bfd6cbad9df8e388f88f3a";
    const bytes = Stamped.serialize({
      kind: 1,
      hash: [...Buffer.from(hash, "hex")],
      ref_id: [...new TextEncoder().encode("345b0654-d59c-43c1-821b-26a43416fd70")],
      timestamp_ms: 1793154678057n,
      recorder,
    }).toBytes();
    expect(decodeStamped(bytes)).toEqual({ kind: 1, hash, refId: "345b0654-d59c-43c1-821b-26a43416fd70", timestampMs: 1793154678057, recorder });
  });
});
