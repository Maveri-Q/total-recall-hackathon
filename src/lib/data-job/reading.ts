// Builds one reading (bookies + Polymarket for one match at one moment). Pure, no network.
//
// Bookie consensus: remove each bookie's margin, take the median chance for each outcome across
// bookies, then scale the three medians to add up to 1. The median stops one odd bookie from
// pulling the number around.
import { createHash } from "node:crypto";
import { chancesFromOdds, chancesFromPrices, normalise, OUTCOMES, type ThreeWay } from "../odds";
import { inSync, type ReadingKind } from "./schedule";

/** Polymarket match markets need this much USD traded (all three together) to count. */
export const MIN_POLY_VOLUME_USD = 10_000;

export const READING_SCHEMA = "total-recall/reading/v1";

export type BookiePrice = {
  key: string;
  title: string;
  last_update: string;
  home: number;
  draw: number;
  away: number;
};

export type PolyPrices = {
  eventId: string;
  fetchedAt: string;
  volume: number;
  yes: ThreeWay;
};

export type MatchRef = {
  oddsApiId: string;
  leagueCode: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export type Reading = {
  kind: ReadingKind;
  odds_fetched_at: string;
  bookies: BookiePrice[];
  bookie_count: number;
  bookie_home: number | null;
  bookie_draw: number | null;
  bookie_away: number | null;
  poly_status: "ok" | "thin_market" | "not_found";
  poly_fetched_at: string | null;
  poly_volume: number | null;
  poly_yes_home: number | null;
  poly_yes_draw: number | null;
  poly_yes_away: number | null;
  poly_home: number | null;
  poly_draw: number | null;
  poly_away: number | null;
  in_sync: boolean;
  usable: boolean;
  content_hash: string;
};

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Median margin-free chance per outcome across bookies, scaled to add up to 1. Null with no valid bookie. */
export function bookieConsensus(bookies: BookiePrice[]): ThreeWay | null {
  const fair = bookies.map((b) => chancesFromOdds(b)).filter((c): c is ThreeWay => c !== null);
  if (fair.length === 0) return null;
  return normalise({
    home: median(fair.map((c) => c.home)),
    draw: median(fair.map((c) => c.draw)),
    away: median(fair.map((c) => c.away)),
  });
}

/** Fixed order and field list, so anyone can rebuild the same hash from the saved reading. */
export function readingPayload(match: MatchRef, kind: ReadingKind, oddsFetchedAt: string, bookies: BookiePrice[], poly: PolyPrices | null): string {
  const sortedBookies = [...bookies]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((b) => [b.key, b.last_update, b.home, b.draw, b.away]);
  return JSON.stringify([
    READING_SCHEMA,
    match.oddsApiId,
    match.leagueCode,
    match.homeTeam,
    match.awayTeam,
    new Date(match.kickoffAt).toISOString(),
    kind,
    oddsFetchedAt,
    sortedBookies,
    poly ? [poly.eventId, poly.fetchedAt, poly.volume, ...OUTCOMES.map((o) => poly.yes[o])] : null,
  ]);
}

export function buildReading(
  match: MatchRef,
  kind: ReadingKind,
  oddsFetchedAt: string,
  bookies: BookiePrice[],
  poly: PolyPrices | null,
): Reading {
  const consensus = bookieConsensus(bookies);
  const polyChances = poly ? chancesFromPrices(poly.yes) : null;
  const polyStatus = !poly || !polyChances ? "not_found" : poly.volume < MIN_POLY_VOLUME_USD ? "thin_market" : "ok";
  const synced = inSync(oddsFetchedAt, poly?.fetchedAt ?? null);

  return {
    kind,
    odds_fetched_at: oddsFetchedAt,
    bookies,
    bookie_count: bookies.length,
    bookie_home: consensus?.home ?? null,
    bookie_draw: consensus?.draw ?? null,
    bookie_away: consensus?.away ?? null,
    poly_status: polyStatus,
    poly_fetched_at: poly?.fetchedAt ?? null,
    poly_volume: poly?.volume ?? null,
    poly_yes_home: poly?.yes.home ?? null,
    poly_yes_draw: poly?.yes.draw ?? null,
    poly_yes_away: poly?.yes.away ?? null,
    poly_home: polyChances?.home ?? null,
    poly_draw: polyChances?.draw ?? null,
    poly_away: polyChances?.away ?? null,
    in_sync: synced,
    usable: consensus !== null && polyStatus === "ok" && synced,
    content_hash: createHash("sha256")
      .update(readingPayload(match, kind, oddsFetchedAt, bookies, poly), "utf8")
      .digest("hex"),
  };
}
