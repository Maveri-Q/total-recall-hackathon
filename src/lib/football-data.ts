// Every call to football-data.org (fixtures and team lists) lives here.
// Free tier: 10 requests a minute, so results are cached for an hour.
import "server-only";
import { cacheLife } from "next/cache";

const BASE_URL = "https://api.football-data.org/v4";

export type Fixture = {
  id: number;
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
  competitionCode: string;
};

export type FootballDataResult<T> = { ok: true; data: T } | { ok: false; error: string };

type ApiTeam = { id: number | null; name: string | null; shortName: string | null };
type ApiMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  competition: { code: string };
};

function teamName(t: ApiTeam): string {
  return (t.shortName || t.name || "").trim();
}

function toFixture(m: ApiMatch): Fixture | null {
  const homeTeam = teamName(m.homeTeam);
  const awayTeam = teamName(m.awayTeam);
  // Knockout draws can list matches before the teams are known. Skip those.
  if (!homeTeam || !awayTeam) return null;
  return { id: m.id, kickoffAt: m.utcDate, homeTeam, awayTeam, competitionCode: m.competition.code };
}

export function hasFootballDataKey(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY);
}

async function get<T>(path: string): Promise<T> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY is missing");
  const res = await fetch(`${BASE_URL}${path}`, { headers: { "X-Auth-Token": key } });
  if (!res.ok) throw new Error(`football-data.org returned ${res.status} for ${path}`);
  return (await res.json()) as T;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function cachedUpcoming(code: string): Promise<Fixture[]> {
  "use cache";
  cacheLife("hours");
  const today = new Date();
  const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const data = await get<{ matches: ApiMatch[] }>(
    `/competitions/${code}/matches?status=SCHEDULED,TIMED&dateFrom=${isoDay(today)}&dateTo=${isoDay(inTwoWeeks)}`,
  );
  return data.matches.map(toFixture).filter((f): f is Fixture => f !== null);
}

async function cachedTeams(code: string): Promise<string[]> {
  "use cache";
  cacheLife("days");
  const data = await get<{ teams: ApiTeam[] }>(`/competitions/${code}/teams`);
  return [...new Set(data.teams.map(teamName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

async function cachedMatch(id: number): Promise<ApiMatch> {
  "use cache";
  cacheLife("minutes");
  const data = await get<ApiMatch | { match: ApiMatch }>(`/matches/${id}`);
  return "match" in data ? data.match : data;
}

/** Matches in the next two weeks that haven't kicked off yet, soonest first. */
export async function getUpcomingFixtures(code: string, now: Date): Promise<FootballDataResult<Fixture[]>> {
  try {
    const fixtures = await cachedUpcoming(code);
    return {
      ok: true,
      data: fixtures
        .filter((f) => new Date(f.kickoffAt).getTime() > now.getTime())
        .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)),
    };
  } catch (e) {
    console.error("football-data fixtures", e);
    return { ok: false, error: "Couldn't load fixtures right now." };
  }
}

export async function getTeams(code: string): Promise<FootballDataResult<string[]>> {
  try {
    return { ok: true, data: await cachedTeams(code) };
  } catch (e) {
    console.error("football-data teams", e);
    return { ok: false, error: "Couldn't load the team list right now." };
  }
}

/** Looks a fixture up by id, so the server never trusts teams or kickoff sent from the browser. */
export async function getFixture(id: number): Promise<FootballDataResult<Fixture & { status: string }>> {
  try {
    const m = await cachedMatch(id);
    const fixture = toFixture(m);
    if (!fixture) return { ok: false, error: "The teams for this match aren't confirmed yet." };
    return { ok: true, data: { ...fixture, status: m.status } };
  } catch (e) {
    console.error("football-data match", e);
    return { ok: false, error: "Couldn't check this match right now. Try again in a minute." };
  }
}
