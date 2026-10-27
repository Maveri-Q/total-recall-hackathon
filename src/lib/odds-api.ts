// Every call to The Odds API lives here. Server and data job only (needs ODDS_API_KEY).
// /events is free. /odds costs 1 credit per call (h2h market, UK region) and covers a whole league.
import type { BookiePrice } from "./data-job/reading";
import { fetchWithRetry } from "./http";

const BASE_URL = "https://api.the-odds-api.com/v4";

export type OddsEvent = { id: string; homeTeam: string; awayTeam: string; kickoffAt: string };

type ApiEvent = { id: string; home_team: string; away_team: string; commence_time: string };
type ApiOddsEvent = ApiEvent & {
  bookmakers: {
    key: string;
    title: string;
    last_update: string;
    markets: { key: string; outcomes: { name: string; price: number }[] }[];
  }[];
};

function apiKey(): string {
  const key = process.env.ODDS_API_KEY?.trim();
  if (!key) throw new Error("ODDS_API_KEY is missing");
  return key;
}

async function get<T>(path: string): Promise<{ data: T; creditsRemaining: number | null; creditsUsedByCall: number }> {
  const res = await fetchWithRetry(`${BASE_URL}${path}${path.includes("?") ? "&" : "?"}apiKey=${apiKey()}`);
  if (!res.ok) {
    // Never include the URL: it carries the key.
    throw new Error(`The Odds API returned ${res.status} for ${path.split("?")[0]}`);
  }
  const remaining = res.headers.get("x-requests-remaining");
  return {
    data: (await res.json()) as T,
    creditsRemaining: remaining === null ? null : Number(remaining),
    creditsUsedByCall: Number(res.headers.get("x-requests-last") ?? 0),
  };
}

/** Upcoming and live matches for one league. Free: costs no credits. */
export async function listEvents(sportKey: string): Promise<OddsEvent[]> {
  const { data } = await get<ApiEvent[]>(`/sports/${sportKey}/events`);
  return data.map((e) => ({ id: e.id, homeTeam: e.home_team, awayTeam: e.away_team, kickoffAt: e.commence_time }));
}

/**
 * Home/draw/away decimal odds from every UK bookie, for every upcoming match in one league.
 * Costs 1 credit. Bookies missing any of the three prices are left out.
 */
export async function fetchLeagueOdds(sportKey: string): Promise<{
  fetchedAt: string;
  byEventId: Map<string, BookiePrice[]>;
  creditsRemaining: number | null;
  creditsUsed: number;
}> {
  const fetchedAt = new Date().toISOString();
  const { data, creditsRemaining, creditsUsedByCall } = await get<ApiOddsEvent[]>(
    `/sports/${sportKey}/odds?regions=uk&markets=h2h&oddsFormat=decimal`,
  );

  const byEventId = new Map<string, BookiePrice[]>();
  for (const e of data) {
    const prices: BookiePrice[] = [];
    for (const b of e.bookmakers) {
      const outcomes = b.markets.find((m) => m.key === "h2h")?.outcomes ?? [];
      const price = (name: string) => outcomes.find((o) => o.name === name)?.price;
      const home = price(e.home_team);
      const draw = price("Draw");
      const away = price(e.away_team);
      if (home && draw && away) {
        prices.push({ key: b.key, title: b.title, last_update: b.last_update, home, draw, away });
      }
    }
    byEventId.set(e.id, prices);
  }
  return { fetchedAt, byEventId, creditsRemaining, creditsUsed: creditsUsedByCall };
}
