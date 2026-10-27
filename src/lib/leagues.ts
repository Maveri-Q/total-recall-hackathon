// Leagues the app supports. `code` is the football-data.org competition code (free tier).
// A league without a code has no fixture list, so matches are typed in by hand.

export const LEAGUES = [
  { name: "Premier League", code: "PL" },
  { name: "La Liga", code: "PD" },
  { name: "Serie A", code: "SA" },
  { name: "Bundesliga", code: "BL1" },
  { name: "Ligue 1", code: "FL1" },
  { name: "Champions League", code: "CL" },
  { name: "Europa League", code: null },
] as const;

export type League = (typeof LEAGUES)[number];

export function leagueByName(name: string): League | undefined {
  return LEAGUES.find((l) => l.name === name);
}

export function leagueByCode(code: string): League | undefined {
  return LEAGUES.find((l) => l.code === code);
}
