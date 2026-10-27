import { describe, expect, it } from "vitest";
import { commitmentHash, commitmentPayload, type CommitmentFields } from "./commitment";

const base: CommitmentFields = {
  predictionId: "6f1c2a3e-1111-4222-8333-944455556666",
  version: 1,
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  league: "Premier League",
  kickoffAt: "2026-11-07T15:00:00.000Z",
  pick: "home",
  confidence: 70,
  reason: "Chelsea missing both centre-backs",
  source: null,
};

describe("commitmentHash", () => {
  it("is a 64-character hex sha256", () => {
    expect(commitmentHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives the same hash for the same record", () => {
    expect(commitmentHash(base)).toBe(commitmentHash({ ...base }));
  });

  it("treats the same kickoff moment in different formats as equal", () => {
    // Postgres returns "+00:00", the form sends "Z". Both are the same instant.
    expect(commitmentHash({ ...base, kickoffAt: "2026-11-07T15:00:00+00:00" })).toBe(commitmentHash(base));
    expect(commitmentHash({ ...base, kickoffAt: "2026-11-07T16:00:00+01:00" })).toBe(commitmentHash(base));
  });

  it("changes when any field changes", () => {
    const changed: Partial<CommitmentFields>[] = [
      { predictionId: "6f1c2a3e-1111-4222-8333-944455556667" },
      { version: 2 },
      { homeTeam: "Arsenal FC" },
      { awayTeam: "Spurs" },
      { league: "La Liga" },
      { kickoffAt: "2026-11-07T15:30:00.000Z" },
      { pick: "draw" },
      { confidence: 71 },
      { reason: "Chelsea missing both centre-backs." },
      { source: "Tipster Joe" },
    ];
    const original = commitmentHash(base);
    for (const change of changed) {
      expect(commitmentHash({ ...base, ...change }), JSON.stringify(change)).not.toBe(original);
    }
  });

  it("keeps fields apart so text can't slide between them", () => {
    const a = commitmentPayload({ ...base, homeTeam: "Real", awayTeam: "Madrid CF" });
    const b = commitmentPayload({ ...base, homeTeam: "Real Madrid", awayTeam: "CF" });
    expect(a).not.toBe(b);
  });
});
