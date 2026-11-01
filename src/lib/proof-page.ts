// Data for the Proof page: real counts, the latest Walrus memories (the app's, and the user's own calls only),
// the latest Sui stamps (the app's readings, and the user's own calls only) and when Tatum was last used.
import "server-only";
import { callLabel, type Call } from "./call-result";
import { fanId } from "./fan-id";
import { stampedBeforeKickoff } from "./sui-stamp";
import { createAdminClient } from "./supabase/admin";
import { getWalletStatus, type WalletStatus } from "./wallet";

export type ProofMemory = { id: string; kind: "reading" | "match_result" | "source_record" | "call"; summary: string | null; savedAt: string; blobId: string };
/** `refId` is the reading or call version id carried in the Sui event, used by "Check this stamp". */
export type ProofStamp = { key: string; refId: string; title: string; mine: boolean; at: string; digest: string; late: boolean };

export type ProofPage = {
  memories: number;
  /** Stamps Sui recorded before the game's kickoff. Ones made after (e.g. after a wallet top-up) are `lateStamps`. */
  stamps: number;
  lateStamps: number;
  /** Readings and calls saved but not on Sui yet (the hourly job stamps them). */
  waitingStamps: number;
  /** Null if Sui couldn't be reached. */
  wallet: WalletStatus | null;
  polymarketChecksToday: number;
  gameMemories: ProofMemory[];
  myMemories: ProofMemory[] | null;
  latestStamps: ProofStamp[];
  lastPolymarketCheck: string | null;
  lastSuiStamp: string | null;
};

const LIST = 12;
/** Every memory is listed (the page shows 12 at a time), so the tab counts are true. This cap only keeps the page light later on. */
const ALL_MEMORIES = 500;

export async function getProofPage(now: Date, userId: string | null): Promise<ProofPage> {
  const db = createAdminClient();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const cols = "id, kind, summary, saved_at, blob_id";

  const [memories, stampedReadings, stampedCalls, waitingReadings, waitingCalls, checksToday, game, mine, readingStamps, myStamps, lastPoly, lastCallStamp, wallet] = await Promise.all([
    db.from("memories").select("id", { count: "exact", head: true }).eq("status", "saved"),
    db.from("readings").select("stamped_at, matches(kickoff_at)").eq("sui_status", "stamped"),
    db.from("prediction_versions").select("stamped_at, predictions(kickoff_at)").eq("sui_status", "stamped"),
    db.from("readings").select("id", { count: "exact", head: true }).in("sui_status", ["pending", "failed"]),
    db.from("prediction_versions").select("id", { count: "exact", head: true }).in("sui_status", ["pending", "failed"]),
    db.from("readings").select("id", { count: "exact", head: true }).gte("poly_fetched_at", midnight),
    db.from("memories").select(cols).eq("status", "saved").neq("kind", "call").order("saved_at", { ascending: false }).limit(ALL_MEMORIES),
    userId
      ? db.from("memories").select(cols).eq("status", "saved").eq("kind", "call").eq("fan_id", fanId(userId)).order("saved_at", { ascending: false }).limit(ALL_MEMORIES)
      : Promise.resolve({ data: null, error: null }),
    db.from("readings").select("id, sui_digest, stamped_at, matches(home_team, away_team, kickoff_at)").eq("sui_status", "stamped").order("stamped_at", { ascending: false }).limit(LIST),
    userId
      ? db
          .from("prediction_versions")
          .select("id, pick, sui_digest, stamped_at, predictions!inner(home_team, away_team, kickoff_at)")
          .eq("user_id", userId)
          .eq("sui_status", "stamped")
          .order("stamped_at", { ascending: false })
          .limit(LIST)
      : Promise.resolve({ data: [], error: null }),
    db.from("readings").select("poly_fetched_at").not("poly_fetched_at", "is", null).order("poly_fetched_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("prediction_versions").select("stamped_at").not("stamped_at", "is", null).order("stamped_at", { ascending: false }).limit(1).maybeSingle(),
    getWalletStatus().catch((e) => {
      console.error("wallet status", e instanceof Error ? e.message : e);
      return null;
    }),
  ]);
  for (const r of [memories, stampedReadings, stampedCalls, waitingReadings, waitingCalls, checksToday, game, mine, readingStamps, myStamps]) {
    if (r.error) throw new Error(r.error.message);
  }

  // Every stamp, split into before and after kickoff.
  type Stamped = { stamped_at: string; kickoff: string };
  const allStamps: Stamped[] = [
    ...((stampedReadings.data ?? []) as unknown as { stamped_at: string; matches: { kickoff_at: string } }[]).map((r) => ({ stamped_at: r.stamped_at, kickoff: r.matches.kickoff_at })),
    ...((stampedCalls.data ?? []) as unknown as { stamped_at: string; predictions: { kickoff_at: string } }[]).map((c) => ({ stamped_at: c.stamped_at, kickoff: c.predictions.kickoff_at })),
  ];
  const onTime = allStamps.filter((s) => stampedBeforeKickoff(s.stamped_at, s.kickoff)).length;

  const toMemory = (m: { id: string; kind: ProofMemory["kind"]; summary: string | null; saved_at: string; blob_id: string }) => ({
    id: m.id,
    kind: m.kind,
    summary: m.summary,
    savedAt: m.saved_at,
    blobId: m.blob_id,
  });

  type ReadingStamp = { id: string; sui_digest: string; stamped_at: string; matches: { home_team: string; away_team: string; kickoff_at: string } };
  type CallStamp = { id: string; pick: Call; sui_digest: string; stamped_at: string; predictions: { home_team: string; away_team: string; kickoff_at: string } };
  const latestStamps: ProofStamp[] = [
    ...((readingStamps.data ?? []) as unknown as ReadingStamp[]).map((r) => ({
      key: `r-${r.id}`,
      refId: r.id,
      title: `Odds before kickoff: ${r.matches.home_team} v ${r.matches.away_team}`,
      mine: false,
      at: r.stamped_at,
      digest: r.sui_digest,
      late: !stampedBeforeKickoff(r.stamped_at, r.matches.kickoff_at),
    })),
    ...((myStamps.data ?? []) as unknown as CallStamp[]).map((c) => ({
      key: `c-${c.id}`,
      refId: c.id,
      title: `Your pick: ${callLabel(c.pick, c.predictions.home_team, c.predictions.away_team)}`,
      mine: true,
      at: c.stamped_at,
      digest: c.sui_digest,
      late: !stampedBeforeKickoff(c.stamped_at, c.predictions.kickoff_at),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const lastReadingStamp = (readingStamps.data as unknown as ReadingStamp[] | null)?.[0]?.stamped_at ?? null;
  const lastSui = [lastReadingStamp, lastCallStamp.data?.stamped_at ?? null].filter((x): x is string => !!x).sort().at(-1) ?? null;

  return {
    memories: memories.count ?? 0,
    stamps: onTime,
    lateStamps: allStamps.length - onTime,
    waitingStamps: (waitingReadings.count ?? 0) + (waitingCalls.count ?? 0),
    wallet,
    polymarketChecksToday: checksToday.count ?? 0,
    gameMemories: (game.data ?? []).map(toMemory),
    myMemories: userId ? (mine.data ?? []).map(toMemory) : null,
    latestStamps,
    lastPolymarketCheck: lastPoly.data?.poly_fetched_at ?? null,
    lastSuiStamp: lastSui,
  };
}
