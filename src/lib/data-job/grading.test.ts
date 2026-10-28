import { describe, expect, it } from "vitest";
import { findResultMatch, gradeReading, ninetyMinuteGoals, resultStatus, type ResultMatch } from "./grading";

function fd(id: number, utcDate: string, home: [string, string], away: [string, string], status = "FINISHED"): ResultMatch {
  return {
    id,
    utcDate,
    status,
    homeTeam: { name: home[0], shortName: home[1] },
    awayTeam: { name: away[0], shortName: away[1] },
    score: { duration: "REGULAR", fullTime: { home: 2, away: 1 } },
  };
}

// Real names from football-data.org, 27 to 28 Oct 2026.
const serieA = [
  fd(558556, "2026-10-27T17:30:00Z", ["US Sassuolo Calcio", "Sassuolo"], ["SS Lazio", "Lazio"]),
  fd(558555, "2026-10-27T19:45:00Z", ["AS Roma", "Roma"], ["Cagliari Calcio", "Cagliari"]),
  fd(558549, "2026-10-28T17:30:00Z", ["AC Milan", "Milan"], ["Bologna FC 1909", "Bologna"], "TIMED"),
  fd(558550, "2026-10-28T17:30:00Z", ["Venezia FC", "Venezia FC"], ["FC Internazionale Milano", "Inter"], "TIMED"),
];

describe("findResultMatch", () => {
  it("matches The Odds API names to football-data.org names", () => {
    const at = (homeTeam: string, awayTeam: string, kickoffAt: string) =>
      findResultMatch({ homeTeam, awayTeam, kickoffAt }, serieA)?.id;
    expect(at("Sassuolo", "Lazio", "2026-10-27T17:30:00Z")).toBe(558556);
    expect(at("AS Roma", "Cagliari", "2026-10-27T19:45:00Z")).toBe(558555);
    expect(at("AC Milan", "Bologna", "2026-10-28T17:30:00Z")).toBe(558549);
    expect(at("Venezia", "Inter Milan", "2026-10-28T17:30:00Z")).toBe(558550);
  });

  it("won't match when the kickoff is far off or the teams are swapped", () => {
    expect(findResultMatch({ homeTeam: "Sassuolo", awayTeam: "Lazio", kickoffAt: "2026-10-30T17:30:00Z" }, serieA)).toBeNull();
    expect(findResultMatch({ homeTeam: "Lazio", awayTeam: "Sassuolo", kickoffAt: "2026-10-27T17:30:00Z" }, serieA)).toBeNull();
  });

  it("won't pick when two candidates fit", () => {
    const twice = [...serieA, { ...serieA[0], id: 1 }];
    expect(findResultMatch({ homeTeam: "Sassuolo", awayTeam: "Lazio", kickoffAt: "2026-10-27T17:30:00Z" }, twice)).toBeNull();
  });
});

describe("resultStatus", () => {
  it("only treats finished, postponed and cancelled as final", () => {
    expect(resultStatus("FINISHED")).toBe("finished");
    expect(resultStatus("POSTPONED")).toBe("postponed");
    expect(resultStatus("CANCELLED")).toBe("cancelled");
    expect(resultStatus("IN_PLAY")).toBeNull();
    expect(resultStatus("TIMED")).toBeNull();
    expect(resultStatus("SUSPENDED")).toBeNull();
  });
});

describe("ninetyMinuteGoals", () => {
  it("uses the full-time score for a normal match", () => {
    expect(ninetyMinuteGoals({ duration: "REGULAR", fullTime: { home: 2, away: 6 } })).toEqual({ home: 2, away: 6 });
  });

  it("ignores extra-time goals", () => {
    expect(
      ninetyMinuteGoals({ duration: "EXTRA_TIME", fullTime: { home: 2, away: 1 }, regularTime: { home: 1, away: 1 } }),
    ).toEqual({ home: 1, away: 1 });
  });

  it("returns null when there's no score", () => {
    expect(ninetyMinuteGoals({ fullTime: { home: null, away: null } })).toBeNull();
  });
});

describe("gradeReading", () => {
  const reading = {
    bookie_home: 0.5, bookie_draw: 0.3, bookie_away: 0.2,
    poly_home: "0.6", poly_draw: "0.25", poly_away: "0.15", // Supabase can return numeric as text
    usable: true,
  };

  it("scores both sources and says who was closer (hand-checked)", () => {
    // Bookies: 0.5² + 0.3² + 0.2² = 0.25 + 0.09 + 0.04 = 0.38
    // Polymarket: 0.4² + 0.25² + 0.15² = 0.16 + 0.0625 + 0.0225 = 0.245
    const g = gradeReading(reading, "home");
    expect(g.bookie_brier).toBeCloseTo(0.38, 10);
    expect(g.poly_brier).toBeCloseTo(0.245, 10);
    expect(g.closer).toBe("polymarket");
  });

  it("bookies are closer when the away side wins", () => {
    // Bookies: 0.25 + 0.09 + 0.64 = 0.98. Polymarket: 0.36 + 0.0625 + 0.7225 = 1.145
    const g = gradeReading(reading, "away");
    expect(g.bookie_brier).toBeCloseTo(0.98, 10);
    expect(g.poly_brier).toBeCloseTo(1.145, 10);
    expect(g.closer).toBe("bookies");
  });

  it("scores but never picks a winner from an unusable reading", () => {
    const g = gradeReading({ ...reading, usable: false }, "home");
    expect(g.bookie_brier).toBeCloseTo(0.38, 10);
    expect(g.poly_brier).toBeCloseTo(0.245, 10);
    expect(g.closer).toBeNull();
  });

  it("scores the bookies alone when there was no Polymarket market", () => {
    const g = gradeReading({ ...reading, poly_home: null, poly_draw: null, poly_away: null, usable: false }, "draw");
    // 0.25 + 0.49 + 0.04 = 0.78
    expect(g.bookie_brier).toBeCloseTo(0.78, 10);
    expect(g.poly_brier).toBeNull();
    expect(g.closer).toBeNull();
  });
});
