// "Check this stamp": reads one stamp back from Sui Mainnet through Tatum, rebuilds the record's fingerprint from
// what we saved, and says whether they match and whether the stamp came before kickoff. Anyone can run it.
import "server-only";
import { callFingerprint, readingFingerprint, type SavedCall, type SavedMatch, type SavedReading } from "./stamp-check";
import { STAMP_KIND } from "./sui-stamp";
import { createAdminClient } from "./supabase/admin";
import { appKeypair, readStamps } from "./tatum";

export type StampCheck =
  | {
      ok: true;
      /** The fingerprint on Sui equals the one rebuilt from our saved record. */
      matches: boolean;
      /** The stamp was made by the app's own wallet (anyone can call the Move module). */
      byApp: boolean;
      kind: "reading" | "call";
      stampedAt: string;
      kickoffAt: string;
      /** Hours between the stamp and kickoff; negative if the stamp came after. */
      hoursBeforeKickoff: number;
      onchainHash: string;
    }
  | { ok: false; error: string };

const DIGEST = /^[1-9A-HJ-NP-Za-km-z]{32,50}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function checkStamp(digest: string, refId: string): Promise<StampCheck> {
  if (!DIGEST.test(digest) || !UUID.test(refId)) return { ok: false, error: "That isn't a stamp we know." };

  const { timestampMs, stamps } = await readStamps(digest);
  const stamp = stamps.find((s) => s.refId === refId);
  if (!stamp) return { ok: false, error: "That record isn't in this Sui transaction." };

  const db = createAdminClient();
  let rebuilt: string;
  let kickoffAt: string;
  if (stamp.kind === STAMP_KIND.reading) {
    const { data, error } = await db
      .from("readings")
      .select("kind, odds_fetched_at, bookies, poly_fetched_at, poly_volume, poly_yes_home, poly_yes_draw, poly_yes_away, matches(odds_api_id, league_code, home_team, away_team, kickoff_at, polymarket_event_id)")
      .eq("id", refId)
      .maybeSingle();
    if (error || !data) return { ok: false, error: "We couldn't find the saved reading." };
    const match = data.matches as unknown as SavedMatch;
    rebuilt = readingFingerprint(data as unknown as SavedReading, match);
    kickoffAt = match.kickoff_at;
  } else {
    const { data, error } = await db
      .from("prediction_versions")
      .select("version, pick, confidence, reason, source, predictions(id, home_team, away_team, league, kickoff_at)")
      .eq("id", refId)
      .maybeSingle();
    if (error || !data) return { ok: false, error: "We couldn't find the saved call." };
    const prediction = data.predictions as unknown as SavedCall["prediction"];
    rebuilt = callFingerprint({ prediction, version: data as unknown as SavedCall["version"] });
    kickoffAt = prediction.kickoff_at;
  }

  // The event carries Sui's own clock time; the transaction's checkpoint time is the same moment, give or take.
  const stampedMs = stamp.timestampMs || timestampMs || 0;
  return {
    ok: true,
    matches: rebuilt === stamp.hash,
    byApp: stamp.recorder === appKeypair().toSuiAddress(),
    kind: stamp.kind === STAMP_KIND.reading ? "reading" : "call",
    stampedAt: new Date(stampedMs).toISOString(),
    kickoffAt: new Date(kickoffAt).toISOString(),
    hoursBeforeKickoff: Math.round(((Date.parse(kickoffAt) - stampedMs) / 3_600_000) * 10) / 10,
    onchainHash: stamp.hash,
  };
}
