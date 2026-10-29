// Data for the Proof page: real counts, the latest Walrus memories (the app's, and the user's own calls only),
// the latest Sui stamps (the app's readings, and the user's own calls only) and when Tatum was last used.
import "server-only";
import { callLabel, type Call } from "./call-result";
import { fanId } from "./fan-id";
import { createAdminClient } from "./supabase/admin";

export type ProofMemory = { id: string; kind: "reading" | "match_result" | "source_record" | "call"; summary: string | null; savedAt: string; blobId: string };
export type ProofStamp = { key: string; title: string; mine: boolean; at: string; digest: string };

export type ProofPage = {
  memories: number;
  stamps: number;
  polymarketChecksToday: number;
  gameMemories: ProofMemory[];
  myMemories: ProofMemory[] | null;
  latestStamps: ProofStamp[];
  lastPolymarketCheck: string | null;
  lastSuiStamp: string | null;
};

const LIST = 12;

export async function getProofPage(now: Date, userId: string | null): Promise<ProofPage> {
  const db = createAdminClient();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const cols = "id, kind, summary, saved_at, blob_id";

  const [memories, stampedReadings, stampedCalls, checksToday, game, mine, readingStamps, myStamps, lastPoly, lastCallStamp] = await Promise.all([
    db.from("memories").select("id", { count: "exact", head: true }).eq("status", "saved"),
    db.from("readings").select("id", { count: "exact", head: true }).eq("sui_status", "stamped"),
    db.from("prediction_versions").select("id", { count: "exact", head: true }).eq("sui_status", "stamped"),
    db.from("readings").select("id", { count: "exact", head: true }).gte("poly_fetched_at", midnight),
    db.from("memories").select(cols).eq("status", "saved").neq("kind", "call").order("saved_at", { ascending: false }).limit(LIST),
    userId
      ? db.from("memories").select(cols).eq("status", "saved").eq("kind", "call").eq("fan_id", fanId(userId)).order("saved_at", { ascending: false }).limit(LIST)
      : Promise.resolve({ data: null, error: null }),
    db.from("readings").select("id, sui_digest, stamped_at, matches(home_team, away_team)").eq("sui_status", "stamped").order("stamped_at", { ascending: false }).limit(LIST),
    userId
      ? db
          .from("prediction_versions")
          .select("id, pick, sui_digest, stamped_at, predictions!inner(home_team, away_team)")
          .eq("user_id", userId)
          .eq("sui_status", "stamped")
          .order("stamped_at", { ascending: false })
          .limit(LIST)
      : Promise.resolve({ data: [], error: null }),
    db.from("readings").select("poly_fetched_at").not("poly_fetched_at", "is", null).order("poly_fetched_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("prediction_versions").select("stamped_at").not("stamped_at", "is", null).order("stamped_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const r of [memories, stampedReadings, stampedCalls, checksToday, game, mine, readingStamps, myStamps]) if (r.error) throw new Error(r.error.message);

  const toMemory = (m: { id: string; kind: ProofMemory["kind"]; summary: string | null; saved_at: string; blob_id: string }) => ({
    id: m.id,
    kind: m.kind,
    summary: m.summary,
    savedAt: m.saved_at,
    blobId: m.blob_id,
  });

  type ReadingStamp = { id: string; sui_digest: string; stamped_at: string; matches: { home_team: string; away_team: string } };
  type CallStamp = { id: string; pick: Call; sui_digest: string; stamped_at: string; predictions: { home_team: string; away_team: string } };
  const latestStamps: ProofStamp[] = [
    ...((readingStamps.data ?? []) as unknown as ReadingStamp[]).map((r) => ({
      key: `r-${r.id}`,
      title: `Odds before kickoff: ${r.matches.home_team} v ${r.matches.away_team}`,
      mine: false,
      at: r.stamped_at,
      digest: r.sui_digest,
    })),
    ...((myStamps.data ?? []) as unknown as CallStamp[]).map((c) => ({
      key: `c-${c.id}`,
      title: `Your pick: ${callLabel(c.pick, c.predictions.home_team, c.predictions.away_team)}`,
      mine: true,
      at: c.stamped_at,
      digest: c.sui_digest,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const lastReadingStamp = (readingStamps.data as unknown as ReadingStamp[] | null)?.[0]?.stamped_at ?? null;
  const lastSui = [lastReadingStamp, lastCallStamp.data?.stamped_at ?? null].filter((x): x is string => !!x).sort().at(-1) ?? null;

  return {
    memories: memories.count ?? 0,
    stamps: (stampedReadings.count ?? 0) + (stampedCalls.count ?? 0),
    polymarketChecksToday: checksToday.count ?? 0,
    gameMemories: (game.data ?? []).map(toMemory),
    myMemories: userId ? (mine.data ?? []).map(toMemory) : null,
    latestStamps,
    lastPolymarketCheck: lastPoly.data?.poly_fetched_at ?? null,
    lastSuiStamp: lastSui,
  };
}
