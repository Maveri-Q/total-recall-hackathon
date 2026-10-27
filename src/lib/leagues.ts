// Leagues the app covers. Each one passed three checks on 27 Oct 2026 (see CLAUDE.md, "Leagues"):
// The Odds API lists it, Polymarket has match markets above our volume threshold,
// and football-data.org's free plan has its results.
// Europa League was dropped: football-data.org's free plan doesn't include it.

export const LEAGUES = [
  { name: "Premier League", code: "PL", oddsApiKey: "soccer_epl", polymarketSeriesId: 10188 },
  { name: "La Liga", code: "PD", oddsApiKey: "soccer_spain_la_liga", polymarketSeriesId: 10193 },
  { name: "Serie A", code: "SA", oddsApiKey: "soccer_italy_serie_a", polymarketSeriesId: 10203 },
  { name: "Bundesliga", code: "BL1", oddsApiKey: "soccer_germany_bundesliga", polymarketSeriesId: 10194 },
  { name: "Ligue 1", code: "FL1", oddsApiKey: "soccer_france_ligue_one", polymarketSeriesId: 10195 },
  { name: "Champions League", code: "CL", oddsApiKey: "soccer_uefa_champs_league", polymarketSeriesId: 10204 },
] as const;

export type League = (typeof LEAGUES)[number];

export function leagueByName(name: string): League | undefined {
  return LEAGUES.find((l) => l.name === name);
}

export function leagueByCode(code: string): League | undefined {
  return LEAGUES.find((l) => l.code === code);
}
