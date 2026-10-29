import { describe, expect, it } from "vitest";
import { FALLBACK_COLORS, findTeam, initials, parseClubColors, teamLook, type TeamRow } from "./team-look";

// Real football-data.org rows, Serie A, 29 Oct 2026.
const row = (football_data_id: number, name: string, short_name: string, tla: string, club_colors: string): TeamRow => ({
  football_data_id, league_code: "SA", name, short_name, tla, club_colors,
  crest_url: `https://crests.football-data.org/${football_data_id}.png`,
});
const serieA = [
  row(98, "AC Milan", "Milan", "MIL", "Red / Black"),
  row(100, "AS Roma", "Roma", "ROM", "Maroon / Orange / White"),
  row(108, "FC Internazionale Milano", "Inter", "INT", "Blue / Black"),
  row(103, "Bologna FC 1909", "Bologna", "BOL", "Red / Blue / White"),
];

describe("findTeam", () => {
  it("links The Odds API's names to the right football-data.org team id", () => {
    expect(findTeam("AS Roma", serieA)?.football_data_id).toBe(100);
    expect(findTeam("Inter Milan", serieA)?.football_data_id).toBe(108);
    expect(findTeam("AC Milan", serieA)?.football_data_id).toBe(98);
  });

  it("gives nothing for a team it can't place", () => {
    expect(findTeam("Cagliari", serieA)).toBeNull();
  });
});

describe("parseClubColors", () => {
  it("takes the first two colours it knows", () => {
    expect(parseClubColors("Maroon / Orange / White")).toEqual(["#7A1E2E", "#F08A24"]);
    expect(parseClubColors("Red / Black")).toEqual(["#C8102E", "#151515"]);
  });

  it("pairs a single colour with chalk, or white with dark green", () => {
    expect(parseClubColors("Purple")).toEqual(["#5B2C83", FALLBACK_COLORS[1]]);
    expect(parseClubColors("White")).toEqual(["#F2F5F1", FALLBACK_COLORS[0]]);
  });

  it("gives nothing for unknown or missing colours", () => {
    expect(parseClubColors("Azure-ish")).toBeNull();
    expect(parseClubColors(null)).toBeNull();
  });
});

describe("teamLook", () => {
  it("uses the crest, colours and code of the matched team", () => {
    expect(teamLook("AS Roma", serieA)).toEqual({
      footballDataId: 100, name: "AS Roma", short: "Roma", initials: "ROM",
      crestUrl: "https://crests.football-data.org/100.png", colors: ["#7A1E2E", "#F08A24"],
    });
  });

  it("falls back to initials on dark green when there's no match", () => {
    expect(teamLook("Cagliari", serieA)).toEqual({
      footballDataId: null, name: "Cagliari", short: "Cagliari", initials: "CAG", crestUrl: null, colors: FALLBACK_COLORS,
    });
  });
});

describe("initials", () => {
  it("skips spaces and symbols", () => {
    expect(initials("St. Pauli")).toBe("STP");
  });
});

describe("findTeam with near-identical names", () => {
  const laLiga: TeamRow[] = [
    { football_data_id: 80, league_code: "PD", name: "RCD Espanyol de Barcelona", short_name: "Espanyol", tla: "ESP", crest_url: null, club_colors: null },
    { football_data_id: 81, league_code: "PD", name: "FC Barcelona", short_name: "Barça", tla: "FCB", crest_url: null, club_colors: null },
  ];
  const ligue1: TeamRow[] = [
    { football_data_id: 524, league_code: "FL1", name: "Paris Saint-Germain FC", short_name: "PSG", tla: "PSG", crest_url: null, club_colors: null },
    { football_data_id: 1045, league_code: "FL1", name: "Paris FC", short_name: "Paris FC", tla: "PFC", crest_url: null, club_colors: null },
  ];

  it("prefers the full match over a partial one", () => {
    expect(findTeam("Barcelona", laLiga)?.football_data_id).toBe(81);
    expect(findTeam("Paris Saint Germain", ligue1)?.football_data_id).toBe(524);
    expect(findTeam("Paris FC", ligue1)?.football_data_id).toBe(1045);
  });

  it("knows Sporting Lisbon and AEK Athens", () => {
    const cl: TeamRow[] = [
      { football_data_id: 498, league_code: "CL", name: "Sporting Clube de Portugal", short_name: "Sporting CP", tla: "SPO", crest_url: null, club_colors: null },
      { football_data_id: 1899, league_code: "CL", name: "PAE AEK", short_name: "PAE AEK", tla: "AEK", crest_url: null, club_colors: null },
    ];
    expect(findTeam("Sporting Lisbon", cl)?.football_data_id).toBe(498);
    expect(findTeam("AEK Athens", cl)?.football_data_id).toBe(1899);
  });
});
