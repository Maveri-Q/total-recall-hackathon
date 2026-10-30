// "Check this stamp" on the Proof page, pure part: rebuild a record's fingerprint from what we saved, and read
// the Stamped event that Sui returned. The network part (fetching the transaction through Tatum) is in tatum.ts,
// and the page puts them together in check-stamp.ts.
import { bcs } from "@mysten/sui/bcs";
import { commitmentHash } from "./commitment";
import type { Call } from "./call-result";
import { readingPayload, type BookiePrice } from "./data-job/reading";
import type { ReadingKind } from "./data-job/schedule";
import { createHash } from "node:crypto";

/** The Move event in move/sources/stamp.move, field for field. */
const Stamped = bcs.struct("Stamped", {
  kind: bcs.u8(),
  hash: bcs.vector(bcs.u8()),
  ref_id: bcs.vector(bcs.u8()),
  timestamp_ms: bcs.u64(),
  recorder: bcs.Address,
});

export type OnchainStamp = { kind: number; hash: string; refId: string; timestampMs: number; recorder: string };

export function decodeStamped(bytes: Uint8Array): OnchainStamp {
  const e = Stamped.parse(bytes);
  return {
    kind: e.kind,
    hash: Buffer.from(e.hash).toString("hex"),
    refId: new TextDecoder().decode(new Uint8Array(e.ref_id)),
    timestampMs: Number(e.timestamp_ms),
    recorder: e.recorder,
  };
}

const num = (x: unknown) => (x == null ? null : Number(x));
/** The database gives times back as "...+00:00"; the fingerprint was made from JavaScript's "...Z" form. */
const iso = (x: string) => new Date(x).toISOString();

export type SavedReading = {
  kind: ReadingKind;
  odds_fetched_at: string;
  bookies: BookiePrice[];
  poly_fetched_at: string | null;
  poly_volume: unknown;
  poly_yes_home: unknown;
  poly_yes_draw: unknown;
  poly_yes_away: unknown;
};
export type SavedMatch = { odds_api_id: string; league_code: string; home_team: string; away_team: string; kickoff_at: string; polymarket_event_id: string | null };

/** The fingerprint of an odds reading, rebuilt from the saved row exactly as buildReading made it. */
export function readingFingerprint(r: SavedReading, m: SavedMatch): string {
  const poly =
    r.poly_fetched_at && m.polymarket_event_id
      ? {
          eventId: m.polymarket_event_id,
          fetchedAt: iso(r.poly_fetched_at),
          volume: Number(r.poly_volume),
          yes: { home: num(r.poly_yes_home)!, draw: num(r.poly_yes_draw)!, away: num(r.poly_yes_away)! },
        }
      : null;
  const match = { oddsApiId: m.odds_api_id, leagueCode: m.league_code, homeTeam: m.home_team, awayTeam: m.away_team, kickoffAt: m.kickoff_at };
  return createHash("sha256").update(readingPayload(match, r.kind, iso(r.odds_fetched_at), r.bookies, poly), "utf8").digest("hex");
}

export type SavedCall = {
  prediction: { id: string; home_team: string; away_team: string; league: string; kickoff_at: string };
  version: { version: number; pick: Call; confidence: number | null; reason: string | null; source: string | null };
};

/** The fingerprint of one call version, rebuilt with the same fields makeCall hashed. */
export function callFingerprint({ prediction: p, version: v }: SavedCall): string {
  return commitmentHash({
    predictionId: p.id,
    version: v.version,
    homeTeam: p.home_team,
    awayTeam: p.away_team,
    league: p.league,
    kickoffAt: p.kickoff_at,
    pick: v.pick,
    confidence: v.confidence,
    reason: v.reason,
    source: v.source,
  });
}
