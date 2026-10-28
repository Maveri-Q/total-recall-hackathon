// Checks what the user typed into the prediction form. Pure functions, no database.
import { leagueByName } from "./leagues";

export const PICKS = ["home", "draw", "away"] as const;
export type Pick = (typeof PICKS)[number];

export type MatchInput = {
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffAt: string;
  /** football-data.org match id when picked from the fixture list, null when typed in. */
  externalMatchId: number | null;
};

/** A fixture as football-data.org describes it (see src/lib/football-data.ts). */
export type FixtureLike = {
  id: number;
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
  competitionCode: string;
  status: string;
};

export type PickInput = {
  pick: Pick;
  confidence: number;
  reason: string | null;
  source: string | null;
};

export type FieldErrors = Partial<Record<keyof MatchInput | keyof PickInput, string>>;

type Result<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

/** Collapses repeated spaces and trims, so "Man  Utd " and "Man Utd" are the same. */
function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function isLocked(kickoffAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(kickoffAt).getTime();
}

export function pickLabel(pick: Pick, homeTeam: string, awayTeam: string): string {
  if (pick === "home") return `${homeTeam} win`;
  if (pick === "away") return `${awayTeam} win`;
  return "Draw";
}

export function parseMatch(raw: Record<string, unknown>, now: Date = new Date()): Result<MatchInput> {
  const errors: FieldErrors = {};
  const homeTeam = clean(raw.homeTeam);
  const awayTeam = clean(raw.awayTeam);
  const league = clean(raw.league);
  const kickoffRaw = clean(raw.kickoffAt);

  if (homeTeam.length < 2 || homeTeam.length > 60) errors.homeTeam = "Enter the home team.";
  if (awayTeam.length < 2 || awayTeam.length > 60) errors.awayTeam = "Enter the away team.";
  if (!errors.homeTeam && !errors.awayTeam && homeTeam.toLowerCase() === awayTeam.toLowerCase()) {
    errors.awayTeam = "Home and away can't be the same team.";
  }
  if (!leagueByName(league)) errors.league = "Choose a league.";

  const kickoff = new Date(kickoffRaw);
  if (!kickoffRaw || Number.isNaN(kickoff.getTime())) {
    errors.kickoffAt = "Enter both the kickoff date and the kickoff time.";
  } else if (isLocked(kickoff, now)) {
    errors.kickoffAt = "Too late. This match has already kicked off, and picks lock at kickoff.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { homeTeam, awayTeam, league, kickoffAt: kickoff.toISOString(), externalMatchId: null },
  };
}

/** Builds the match from a fixture looked up on the server, checking it fits the chosen league. */
export function matchFromFixture(fixture: FixtureLike, leagueName: string, now: Date = new Date()): Result<MatchInput> {
  const league = leagueByName(leagueName);
  if (!league || league.code !== fixture.competitionCode) {
    return { ok: false, errors: { league: "That match isn't in this league. Choose it again." } };
  }
  if (!["SCHEDULED", "TIMED"].includes(fixture.status) || isLocked(fixture.kickoffAt, now)) {
    return {
      ok: false,
      errors: { kickoffAt: "Too late. This match has already kicked off, or it was postponed." },
    };
  }
  return {
    ok: true,
    value: {
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      league: league.name,
      kickoffAt: new Date(fixture.kickoffAt).toISOString(),
      externalMatchId: fixture.id,
    },
  };
}

export function parsePick(raw: Record<string, unknown>): Result<PickInput> {
  const errors: FieldErrors = {};
  const pick = clean(raw.pick);
  const confidenceText = clean(raw.confidence);
  const confidence = Number(confidenceText);
  // "mine" = the user's own call. "tip" = someone else's tip, and then we need their name.
  const isTip = clean(raw.sourceType) === "tip";
  const source = isTip ? clean(raw.source) : "";

  if (!(PICKS as readonly string[]).includes(pick)) errors.pick = "Choose who wins, or a draw.";
  if (!confidenceText || !Number.isInteger(confidence) || confidence < 1 || confidence > 100) {
    errors.confidence = "Enter a whole number from 1 to 100.";
  }
  if (isTip && source.length < 2) errors.source = "Whose tip is it? Add their name or account.";
  else if (source.length > 120) errors.source = "Keep the name under 120 characters.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { pick: pick as Pick, confidence, reason: null, source: source || null },
  };
}

/** True when a new save would be identical to the latest version. */
export function samePick(a: PickInput, b: PickInput): boolean {
  return a.pick === b.pick && a.confidence === b.confidence && a.reason === b.reason && a.source === b.source;
}
