import { describe, expect, it } from "vitest";
import { isLocked, matchFromFixture, parseMatch, parsePick, pickLabel, samePick } from "./prediction-input";

const now = new Date("2026-11-06T12:00:00Z");

describe("isLocked", () => {
  it("is open before kickoff and locked from kickoff on", () => {
    expect(isLocked("2026-11-06T12:00:01Z", now)).toBe(false);
    expect(isLocked("2026-11-06T12:00:00Z", now)).toBe(true);
    expect(isLocked("2026-11-06T11:59:59Z", now)).toBe(true);
  });
});

describe("parseMatch", () => {
  const good = {
    homeTeam: "  Arsenal ",
    awayTeam: "Chelsea",
    league: "Premier League",
    kickoffAt: "2026-11-07T15:00:00.000Z",
  };

  it("accepts a future match and tidies spaces", () => {
    const r = parseMatch(good, now);
    expect(r).toEqual({
      ok: true,
      value: {
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        league: "Premier League",
        kickoffAt: "2026-11-07T15:00:00.000Z",
        externalMatchId: null,
      },
    });
  });

  it("rejects a match that has already kicked off", () => {
    const r = parseMatch({ ...good, kickoffAt: "2026-11-06T11:00:00Z" }, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.kickoffAt).toMatch(/kicked off/);
  });

  it("rejects missing or bad fields", () => {
    const r = parseMatch({ homeTeam: "", awayTeam: "x", league: "Sunday League", kickoffAt: "not a date" }, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["awayTeam", "homeTeam", "kickoffAt", "league"]);
  });

  it("rejects the same team twice, ignoring case", () => {
    const r = parseMatch({ ...good, awayTeam: "arsenal" }, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.awayTeam).toBeDefined();
  });
});

describe("matchFromFixture", () => {
  const fixture = {
    id: 537001,
    kickoffAt: "2026-11-07T15:00:00Z",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    competitionCode: "PL",
    status: "TIMED",
  };

  it("uses the fixture's teams and kickoff, not anything typed", () => {
    expect(matchFromFixture(fixture, "Premier League", now)).toEqual({
      ok: true,
      value: {
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        league: "Premier League",
        kickoffAt: "2026-11-07T15:00:00.000Z",
        externalMatchId: 537001,
      },
    });
  });

  it("rejects a fixture from a different league", () => {
    expect(matchFromFixture(fixture, "La Liga", now).ok).toBe(false);
  });

  it("rejects a fixture that has started or was postponed", () => {
    expect(matchFromFixture({ ...fixture, kickoffAt: "2026-11-06T11:00:00Z" }, "Premier League", now).ok).toBe(false);
    expect(matchFromFixture({ ...fixture, status: "POSTPONED" }, "Premier League", now).ok).toBe(false);
  });
});

describe("parsePick", () => {
  const good = { pick: "draw", confidence: "60", sourceType: "mine" };

  it("accepts the user's own pick with no source", () => {
    expect(parsePick(good)).toEqual({
      ok: true,
      value: { pick: "draw", confidence: 60, reason: null, source: null },
    });
  });

  it("ignores a leftover tipster name when the pick is the user's own", () => {
    const r = parsePick({ ...good, source: "Tipster Joe" });
    expect(r.ok && r.value.source).toBe(null);
  });

  it("keeps the tipster's name for a followed tip, and asks for it when missing", () => {
    const r = parsePick({ ...good, sourceType: "tip", source: " @tipster_joe " });
    expect(r.ok && r.value.source).toBe("@tipster_joe");
    const missing = parsePick({ ...good, sourceType: "tip", source: "" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.source).toBeDefined();
  });

  it.each(["0", "101", "55.5", "", "abc"])("rejects confidence %j", (confidence) => {
    const r = parsePick({ ...good, confidence });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown pick and a long tipster name", () => {
    const r = parsePick({ pick: "win", confidence: "50", sourceType: "tip", source: "x".repeat(121) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["pick", "source"]);
  });
});

describe("samePick", () => {
  it("spots an unchanged pick", () => {
    const a = { pick: "home" as const, confidence: 70, reason: "Form", source: null };
    expect(samePick(a, { ...a })).toBe(true);
    expect(samePick(a, { ...a, confidence: 71 })).toBe(false);
  });
});

describe("pickLabel", () => {
  it("names the team", () => {
    expect(pickLabel("home", "Arsenal", "Chelsea")).toBe("Arsenal win");
    expect(pickLabel("away", "Arsenal", "Chelsea")).toBe("Chelsea win");
    expect(pickLabel("draw", "Arsenal", "Chelsea")).toBe("Draw");
  });
});
