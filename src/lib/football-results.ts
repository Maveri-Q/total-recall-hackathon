// Results from football-data.org for the data job's grading step.
// (src/lib/football-data.ts serves the website and uses Next's cache, so it can't run in the job.)
// Free plan: 10 requests a minute. The job makes at most one call per league per run.
import { fetchWithRetry } from "./http";
import type { ResultMatch } from "./data-job/grading";

const BASE_URL = "https://api.football-data.org/v4";

/** Every match in a league between two UTC days (both included). */
export async function fetchLeagueResults(leagueCode: string, fromDay: string, toDay: string): Promise<ResultMatch[]> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY is missing");
  const res = await fetchWithRetry(
    `${BASE_URL}/competitions/${leagueCode}/matches?dateFrom=${fromDay}&dateTo=${toDay}`,
    { headers: { "X-Auth-Token": key } },
  );
  if (!res.ok) throw new Error(`football-data.org returned ${res.status} for ${leagueCode} results`);
  const data = (await res.json()) as { matches: ResultMatch[] };
  return data.matches;
}
