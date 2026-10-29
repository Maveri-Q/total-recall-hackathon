// Data for the Memory page: how many memories are saved on Walrus, how each league's score changed,
// and a feed of the latest Walrus writes (from the `memories` table, which logs every write).
import "server-only";
import { matchVerdict, type ReadingRow } from "./data-job/memories";
import { fanId } from "./fan-id";
import { leagueByCode } from "./leagues";
import { scoreHistory, type GradedGame, type LeagueHistory } from "./memory-history";
import { createAdminClient } from "./supabase/admin";

export type FeedItem = {
  id: string;
  kind: "reading" | "match_result" | "source_record" | "call";
  mine: boolean;
  summary: string | null;
  savedAt: string;
  blobId: string;
};

export type MemoryPage = {
  total: number;
  today: number;
  newestBlobId: string | null;
  leagues: (LeagueHistory & { name: string })[];
  feed: FeedItem[];
};

const FEED_SIZE = 30;

export async function getMemoryPage(now: Date, userId: string | null): Promise<MemoryPage> {
  const db = createAdminClient();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const myFan = userId ? fanId(userId) : null;

  const [total, today, latest, mine, graded] = await Promise.all([
    db.from("memories").select("id", { count: "exact", head: true }).eq("status", "saved"),
    db.from("memories").select("id", { count: "exact", head: true }).eq("status", "saved").gte("saved_at", midnight),
    db
      .from("memories")
      .select("id, kind, fan_id, summary, saved_at, blob_id")
      .eq("status", "saved")
      .order("saved_at", { ascending: false })
      .limit(FEED_SIZE),
    // The user's own calls, even if they're older than the latest few writes.
    myFan
      ? db
          .from("memories")
          .select("id, kind, fan_id, summary, saved_at, blob_id")
          .eq("status", "saved")
          .eq("fan_id", myFan)
          .order("saved_at", { ascending: false })
          .limit(FEED_SIZE)
      : Promise.resolve({ data: [], error: null }),
    db.from("matches").select("league_code, kickoff_at, readings(*)").eq("result_status", "finished").not("graded_at", "is", null),
  ]);
  for (const r of [total, today, latest, mine, graded]) if (r.error) throw new Error(r.error.message);

  const rows = new Map([...(latest.data ?? []), ...(mine.data ?? [])].map((m) => [m.id, m]));
  const feed = [...rows.values()]
    .sort((a, b) => b.saved_at.localeCompare(a.saved_at))
    .map((m) => ({
      id: m.id,
      kind: m.kind,
      mine: myFan !== null && m.fan_id === myFan,
      summary: m.summary,
      savedAt: m.saved_at,
      blobId: m.blob_id,
    }));

  const games: GradedGame[] = [];
  for (const m of graded.data ?? []) {
    const verdict = matchVerdict(m.readings as ReadingRow[]);
    if (verdict) games.push({ leagueCode: m.league_code, kickoffAt: m.kickoff_at, verdict });
  }

  return {
    total: total.count ?? 0,
    today: today.count ?? 0,
    newestBlobId: latest.data?.[0]?.blob_id ?? null,
    leagues: scoreHistory(games, now).map((h) => ({ ...h, name: leagueByCode(h.leagueCode)?.name ?? h.leagueCode })),
    feed,
  };
}
