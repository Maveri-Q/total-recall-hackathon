// How a team looks on a match card: crest, two club colours and a 3-letter badge.
// Pure functions, no network or database.
//
// Crests are matched by football-data.org team id, never shown from a name guess: our match rows use
// The Odds API's spelling ("Inter Milan"), so the data job's team matching (teamMatchScore) links that name
// to exactly one football-data.org team in the same league first.
import { teamMatchScore } from "./data-job/team-names";

export type TeamRow = {
  football_data_id: number;
  league_code: string;
  name: string;
  short_name: string | null;
  tla: string | null;
  crest_url: string | null;
  club_colors: string | null;
};

export type TeamLook = {
  footballDataId: number | null;
  name: string;
  /** Short name for pills and buttons ("Roma", "Wolves"), from football-data.org when we know the team. */
  short: string;
  initials: string;
  crestUrl: string | null;
  colors: [string, string];
};

/** Fallback when a team has no colours: chalk on dark green (UI.md). */
export const FALLBACK_COLORS: [string, string] = ["#1D3A2E", "#F2F5F1"];

// football-data.org writes colours as words. Hex values picked to read well on the dark UI.
const COLOR_WORDS: Record<string, string> = {
  red: "#C8102E", white: "#F2F5F1", black: "#151515", blue: "#1B4F9C", "royal blue": "#1D4FB8",
  navy: "#14213D", "navy blue": "#14213D", "dark blue": "#14213D", "sky blue": "#6CABDD", "light blue": "#6CABDD",
  yellow: "#F2C200", gold: "#D4A72C", amber: "#F5A524", green: "#1F7A3A", "dark green": "#145A32",
  claret: "#7A263A", maroon: "#7A1E2E", burgundy: "#7A1E2E", orange: "#F08A24", purple: "#5B2C83",
  violet: "#5B2C83", grey: "#8A8D91", gray: "#8A8D91", silver: "#B8BCC2", pink: "#E05A8A", brown: "#6B4226",
  "red wine": "#7A1E2E", granate: "#7A1E2E", "black and white": "#151515",
};

/** "Maroon / Orange / White" → the first two colours we know, as hex. */
export function parseClubColors(text: string | null | undefined): [string, string] | null {
  if (!text) return null;
  const hex = text
    .split(/[/,&]|\band\b/i)
    .map((w) => COLOR_WORDS[w.trim().toLowerCase()])
    .filter((c): c is string => Boolean(c));
  if (hex.length === 0) return null;
  // One known colour: pair it with chalk, or dark ground if the colour is already light.
  if (hex.length === 1) return [hex[0], hex[0] === COLOR_WORDS.white ? FALLBACK_COLORS[0] : FALLBACK_COLORS[1]];
  return [hex[0], hex[1] === hex[0] ? FALLBACK_COLORS[1] : hex[1]];
}

/**
 * The one team in this league whose name matches, or null if none or several do.
 * A full match beats a partial one: "Barcelona" is "FC Barcelona", not "Espanyol de Barcelona".
 */
export function findTeam(name: string, leagueTeams: TeamRow[]): TeamRow | null {
  const score = (t: TeamRow) => Math.max(...[t.name, t.short_name].map((n) => (n ? teamMatchScore(name, n) : 0)));
  for (const wanted of [2, 1] as const) {
    const found = leagueTeams.filter((t) => score(t) === wanted);
    if (found.length > 0) return found.length === 1 ? found[0] : null;
  }
  return null;
}

/** First 3 letters of a name, for the badge ("ROM"). */
export function initials(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 3).toUpperCase();
}

export function teamLook(name: string, leagueTeams: TeamRow[]): TeamLook {
  const team = findTeam(name, leagueTeams);
  return {
    footballDataId: team?.football_data_id ?? null,
    name,
    short: team?.short_name || name,
    initials: team?.tla || initials(team?.short_name || name),
    crestUrl: team?.crest_url ?? null,
    colors: parseClubColors(team?.club_colors) ?? FALLBACK_COLORS,
  };
}
