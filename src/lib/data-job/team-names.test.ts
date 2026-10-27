import { describe, expect, it } from "vitest";
import { findMatchingEvent, mapMarkets, sameTeam, splitMatchTitle, teamWords } from "./team-names";

describe("sameTeam", () => {
  it.each([
    ["Paris Saint Germain", "Paris Saint-Germain FC"],
    ["PSG", "Paris Saint-Germain FC"],
    ["Manchester United", "Manchester United FC"],
    ["Brighton and Hove Albion", "Brighton & Hove Albion FC"],
    ["Inter Milan", "FC Internazionale Milano"],
    ["Bayern Munich", "FC Bayern München"],
    ["Atletico Madrid", "Club Atlético de Madrid"],
    ["Athletic Bilbao", "Athletic Club"],
    ["Bayer Leverkusen", "Bayer 04 Leverkusen"],
    ["Celta Vigo", "RC Celta de Vigo"],
    ["Rayo Vallecano", "Rayo Vallecano de Madrid"],
    ["Borussia Monchengladbach", "Borussia Mönchengladbach"],
    ["FSV Mainz 05", "1. FSV Mainz 05"],
    ["Alavés", "Deportivo Alavés"],
    ["Brest", "Stade Brestois 29"],
    ["Rennes", "Stade Rennais FC 1901"],
    ["Lyon", "Olympique Lyonnais"],
  ])("%s = %s", (a, b) => {
    expect(sameTeam(a, b)).toBe(true);
  });

  it.each([
    ["Manchester United", "Manchester City FC"],
    ["Real Madrid", "Club Atlético de Madrid"],
    ["AC Milan", "FC Internazionale Milano"],
    ["Real Madrid", "Real Sociedad de Fútbol"],
    ["", "Chelsea FC"],
  ])("%s != %s", (a, b) => {
    expect(sameTeam(a, b)).toBe(false);
  });

  it("drops accents, filler words and numbers", () => {
    expect(teamWords("1. FC Köln")).toEqual(["cologne"]);
  });
});

describe("splitMatchTitle", () => {
  it("splits match titles and rejects others", () => {
    expect(splitMatchTitle("Chelsea FC vs. Manchester United FC")).toEqual(["Chelsea FC", "Manchester United FC"]);
    expect(splitMatchTitle("Chelsea FC vs. Manchester United FC - More Markets")).toBeNull();
    expect(splitMatchTitle("EPL: 2027 Champion")).toBeNull();
  });
});

describe("findMatchingEvent", () => {
  const match = { homeTeam: "Chelsea", awayTeam: "Manchester United", kickoffAt: "2026-10-31T12:30:00Z" };
  const real = { id: "1209076", title: "Chelsea FC vs. Manchester United FC", closeTime: "2026-10-31T12:30:00.000Z", marketCount: 3 };

  it("finds the event with both teams and the right kickoff", () => {
    expect(findMatchingEvent(match, [real])?.id).toBe("1209076");
  });

  it("ignores last season's fixture, reversed fixtures and other market types", () => {
    const old = { ...real, id: "1", closeTime: "2026-02-28T15:00:00.000Z" };
    const reversed = { ...real, id: "2", title: "Manchester United FC vs. Chelsea FC" };
    const more = { ...real, id: "3", title: "Chelsea FC vs. Manchester United FC - More Markets", marketCount: 46 };
    expect(findMatchingEvent(match, [old, reversed, more])).toBeNull();
    expect(findMatchingEvent(match, [old, reversed, more, real])?.id).toBe("1209076");
  });

  it("refuses to choose between two different events", () => {
    expect(findMatchingEvent(match, [real, { ...real, id: "999" }])).toBeNull();
  });
});

describe("mapMarkets", () => {
  const title = "Chelsea FC vs. Manchester United FC";
  const markets = [
    { id: "draw-id", question: "Will Chelsea FC vs. Manchester United FC end in a draw?" },
    { id: "away-id", question: "Will Manchester United FC win on 2026-10-31?" },
    { id: "home-id", question: "Will Chelsea FC win on 2026-10-31?" },
  ];

  it("reads which market is which from the question, not the order", () => {
    expect(mapMarkets(title, markets)).toEqual({ home: "home-id", draw: "draw-id", away: "away-id" });
  });

  it("returns null when an outcome is missing", () => {
    expect(mapMarkets(title, markets.slice(0, 2))).toBeNull();
  });

  it("picks the closer name when one fits both teams", () => {
    const paris = mapMarkets("Paris FC vs. Paris Saint-Germain FC", [
      { id: "h", question: "Will Paris FC win on 2026-11-01?" },
      { id: "d", question: "Will Paris FC vs. Paris Saint-Germain FC end in a draw?" },
      { id: "a", question: "Will Paris Saint-Germain FC win on 2026-11-01?" },
    ]);
    expect(paris).toEqual({ home: "h", draw: "d", away: "a" });
  });
});
