// Every call to Tatum lives here. Server and data job only (needs TATUM_API_KEY).
//
// Prediction Markets API (https://api.tatum.io/v4/data/prediction): Polymarket prices for football matches.
//   GET /events?status=active&search=...   find the match event
//   GET /markets?eventId=...     the three markets (home win, draw, away win) with live Yes prices
//
// Sui stamping goes here too, once it's built.
import { findMatchingEvent, mapMarkets, teamWords, type EventCandidate } from "./data-job/team-names";
import type { PolyPrices } from "./data-job/reading";
import { fetchWithRetry } from "./http";

const PREDICTION_URL = "https://api.tatum.io/v4/data/prediction";

/** Free plan allows 3 requests a second. Keep a gap between calls. */
const MIN_GAP_MS = 400;
let lastCall = 0;

function apiKey(): string {
  const key = process.env.TATUM_API_KEY?.trim();
  if (!key) throw new Error("TATUM_API_KEY is missing");
  return key;
}

async function get<T>(path: string): Promise<T> {
  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const res = await fetchWithRetry(PREDICTION_URL + path, { headers: { "x-api-key": apiKey() } });
  if (!res.ok) throw new Error(`Tatum returned ${res.status} for ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

type TatumEvent = EventCandidate & { status: string; source?: { url?: string } };
type TatumMarket = {
  id: string;
  question: string;
  volume: number;
  outcomes: { name: string; price: number }[];
};

export type PolymarketLink = {
  eventId: string;
  title: string;
  url: string | null;
  markets: { home: string; draw: string; away: string };
};

/** Open Polymarket events whose title contains the text. (/search mixes in old closed events.) */
async function searchOpenEvents(q: string): Promise<TatumEvent[]> {
  const body = await get<{ data: TatumEvent[] }>(
    `/events?platform=polymarket&status=active&search=${encodeURIComponent(q)}&limit=100`,
  );
  return body.data.filter((e) => e.status === "active");
}

async function eventMarkets(eventId: string): Promise<TatumMarket[]> {
  const body = await get<{ data: TatumMarket[] }>(`/markets?eventId=${encodeURIComponent(eventId)}`);
  return body.data;
}

/**
 * Finds the Polymarket event for a match and which market is home, draw and away.
 * Returns null when there's no single clear match. We never guess.
 */
export async function findPolymarketMatch(match: {
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
}): Promise<PolymarketLink | null> {
  // Search by each full name, then by each team's longest word ("Bayern Munich" won't find
  // "FC Bayern München", but "Bayern" will). The match rules below still check both teams.
  const longestWord = (name: string) => [...teamWords(name)].sort((a, b) => b.length - a.length)[0];
  const queries = [match.homeTeam, match.awayTeam, longestWord(match.homeTeam), longestWord(match.awayTeam)];
  for (const q of [...new Set(queries.filter(Boolean))]) {
    const event = findMatchingEvent(match, await searchOpenEvents(q));
    if (!event) continue;
    const markets = mapMarkets(event.title, await eventMarkets(event.id));
    if (!markets) return null;
    return { eventId: event.id, title: event.title, url: event.source?.url ?? null, markets };
  }
  return null;
}

/** Live Yes prices for the three markets, plus total USD traded on them. */
export async function fetchPolymarketPrices(link: PolymarketLink): Promise<PolyPrices | null> {
  const markets = await eventMarkets(link.eventId);
  const fetchedAt = new Date().toISOString();
  const yes = (id: string) => markets.find((m) => m.id === id)?.outcomes.find((o) => o.name.toUpperCase() === "YES")?.price;
  const home = yes(link.markets.home);
  const draw = yes(link.markets.draw);
  const away = yes(link.markets.away);
  if (home == null || draw == null || away == null) return null;
  const ours = new Set(Object.values(link.markets));
  const volume = markets.filter((m) => ours.has(m.id)).reduce((sum, m) => sum + (Number(m.volume) || 0), 0);
  return { eventId: link.eventId, fetchedAt, volume, yes: { home, draw, away } };
}
