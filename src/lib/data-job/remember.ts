// The data job's Walrus Memory steps.
//
// queueMemories: writes the text of every new memory into the `memories` table (deterministic code,
//   see memories.ts). One per stamped reading, one per graded match, and a new source record for a
//   league whenever its count of graded matches grows. Calls too (one per call version), with an anonymous
//   fan id only. rememberCallNow saves a call straight after its Sui stamp; the hourly run catches any it missed.
// sendPendingMemories: sends queued memories to Walrus, 20 per call, and records each blob id.
//   A memory sent in an earlier run is checked, never sent twice.
import { LEAGUES } from "../leagues";
import type { Outcome } from "../odds";
import type { createAdminClient } from "../supabase/admin";
import { chunk } from "../sui-stamp";
import { checkMemories, MAX_MEMORIES_PER_CALL, sendMemories, waitForMemories, walrusConfigured, type MemoryJob } from "../walrus";
import {
  callMemoryText,
  callSummary,
  matchResultMemoryText,
  matchResultSummary,
  matchVerdict,
  NAMESPACES,
  readingMemoryText,
  readingSummary,
  sourceRecord,
  sourceRecordMemoryText,
  sourceRecordSummary,
  type MatchInfo,
  type ReadingRow,
  type Verdict,
} from "./memories";
import { callLabel, type Call } from "../call-result";
import { fanId } from "../fan-id";

type Db = ReturnType<typeof createAdminClient>;
type Kind = keyof typeof NAMESPACES;
type NewMemory = { kind: Kind; ref_key: string; namespace: string; text: string; summary: string; fan_id?: string };

const READING_COLUMNS =
  "id, match_id, kind, odds_fetched_at, bookie_count, bookie_home, bookie_draw, bookie_away, poly_status, poly_volume, " +
  "poly_home, poly_draw, poly_away, in_sync, usable, content_hash, sui_digest, bookie_brier, poly_brier, closer";

type MatchRow = {
  id: string;
  league_code: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_goals: number | null;
  away_goals: number | null;
  result: Outcome | null;
  graded_at: string | null;
};

const MAX_ATTEMPTS = 5;
const SEND_PER_RUN = 60;
const WAIT_MS = 3 * 60 * 1000;
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

function leagueName(code: string): string {
  return LEAGUES.find((l) => l.code === code)?.name ?? code;
}

function matchInfo(m: MatchRow): MatchInfo {
  return { leagueName: leagueName(m.league_code), homeTeam: m.home_team, awayTeam: m.away_team, kickoffAt: m.kickoff_at };
}

async function existingKeys(db: Db, kind: Kind, keys: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (const part of chunk(keys, 200)) {
    const { data, error } = await db.from("memories").select("ref_key").eq("kind", kind).in("ref_key", part);
    if (error) throw new Error(`loading memories: ${error.message}`);
    for (const r of data ?? []) found.add(r.ref_key);
  }
  return found;
}

/** Writes the text of every new memory into the database, ready to send. */
export async function queueMemories(db: Db, now: Date, log: string[]) {
  const since = new Date(now.getTime() - LOOKBACK_MS).toISOString();
  const queued: NewMemory[] = [];

  // Readings that are stamped on Sui.
  const { data: readings, error: readingsError } = await db
    .from("readings")
    .select(`${READING_COLUMNS}, matches(id, league_code, home_team, away_team, kickoff_at)`)
    .eq("sui_status", "stamped")
    .gte("taken_at", since);
  if (readingsError) throw new Error(`loading readings: ${readingsError.message}`);
  const rows = (readings ?? []) as unknown as (ReadingRow & { matches: MatchRow })[];
  const haveReading = await existingKeys(db, "reading", rows.map((r) => r.id));
  for (const r of rows) {
    if (haveReading.has(r.id)) continue;
    queued.push({
      kind: "reading",
      ref_key: r.id,
      namespace: NAMESPACES.reading,
      text: readingMemoryText(matchInfo(r.matches), r),
      summary: readingSummary(matchInfo(r.matches), r),
    });
  }

  // Graded matches.
  const { data: graded, error: gradedError } = await db
    .from("matches")
    .select(`id, league_code, home_team, away_team, kickoff_at, home_goals, away_goals, result, graded_at, readings(${READING_COLUMNS})`)
    .eq("result_status", "finished")
    .not("graded_at", "is", null)
    .order("kickoff_at");
  if (gradedError) throw new Error(`loading graded matches: ${gradedError.message}`);
  const matches = (graded ?? []) as unknown as (MatchRow & { readings: ReadingRow[] })[];
  const haveResult = await existingKeys(db, "match_result", matches.map((m) => m.id));
  for (const m of matches) {
    if (haveResult.has(m.id) || m.result === null || m.home_goals === null || m.away_goals === null) continue;
    queued.push({
      kind: "match_result",
      ref_key: m.id,
      namespace: NAMESPACES.match_result,
      text: matchResultMemoryText(matchInfo(m), { homeGoals: m.home_goals, awayGoals: m.away_goals, result: m.result }, m.readings),
      summary: matchResultSummary(matchInfo(m), { homeGoals: m.home_goals, awayGoals: m.away_goals }, m.readings),
    });
  }

  // Source records: every graded match ever, one vote each. A new memory when a count grows.
  const verdicts = new Map<string, Verdict[]>([["ALL", []]]);
  for (const m of matches) {
    const v = matchVerdict(m.readings);
    if (!v) continue;
    verdicts.set(m.league_code, [...(verdicts.get(m.league_code) ?? []), v]);
    verdicts.get("ALL")!.push(v);
  }
  const records = [...verdicts]
    .filter(([, vs]) => vs.length > 0)
    .map(([code, vs]) => ({ key: `${code}:${vs.length}`, scope: code === "ALL" ? "all leagues" : leagueName(code), vs }));
  const haveRecord = await existingKeys(db, "source_record", records.map((r) => r.key));
  for (const r of records) {
    if (haveRecord.has(r.key)) continue;
    queued.push({
      kind: "source_record",
      ref_key: r.key,
      namespace: NAMESPACES.source_record,
      text: sourceRecordMemoryText(r.scope, sourceRecord(r.vs), now.toISOString()),
      summary: sourceRecordSummary(r.scope, sourceRecord(r.vs)),
    });
  }

  // Calls, in case saving one straight after its stamp didn't finish.
  queued.push(...(await queueCallMemories(db, since)));

  if (queued.length === 0) return;
  const { error } = await db.from("memories").upsert(queued, { onConflict: "kind,ref_key", ignoreDuplicates: true });
  if (error) throw new Error(`queueing memories: ${error.message}`);
  log.push(`Queued ${queued.length} memory(ies) for Walrus`);
}

async function saveJobResults(db: Db, rows: { id: string; attempts: number }[], jobs: MemoryJob[], log: string[]) {
  let saved = 0;
  for (const [i, job] of jobs.entries()) {
    const row = rows[i];
    if (job.status === "done" && job.blobId) {
      await db.from("memories").update({ status: "saved", blob_id: job.blobId, saved_at: new Date().toISOString(), error: null }).eq("id", row.id);
      saved++;
    } else if (job.status === "failed") {
      const giveUp = row.attempts >= MAX_ATTEMPTS;
      await db.from("memories").update({ status: giveUp ? "failed" : "pending", job_id: null, error: job.error }).eq("id", row.id);
      log.push(`Walrus memory ${giveUp ? "failed for good" : "failed, will retry"} (${job.error})`);
    }
    // Still running: stays "sent" and is checked next run.
  }
  return saved;
}

/**
 * A memory that failed every try (usually a Walrus outage: on 30 Oct the relayer refused uploads for about
 * three hours) gets a fresh round of tries this long after its last one. An outage delays a memory, never loses it.
 */
export const RETRY_FAILED_AFTER_MS = 2 * 60 * 60 * 1000;

/** Sends queued memories to Walrus Mainnet and records where each one landed. */
export async function sendPendingMemories(db: Db, log: string[], now: Date = new Date()) {
  if (!walrusConfigured()) {
    log.push("Walrus Memory isn't set up yet (MEMWAL keys missing). Memories stay queued.");
    return;
  }
  let saved = 0;

  // Failed ones whose last try was a while ago go back in the queue.
  const { data: revived } = await db
    .from("memories")
    .update({ status: "pending", attempts: 0, error: null })
    .eq("status", "failed")
    .lt("sent_at", new Date(now.getTime() - RETRY_FAILED_AFTER_MS).toISOString())
    .select("id");
  if (revived?.length) log.push(`${revived.length} failed memory(ies) queued for Walrus again`);

  // Sent in an earlier run: check, don't resend.
  const { data: sent } = await db.from("memories").select("id, attempts, job_id").eq("status", "sent").not("job_id", "is", null);
  for (const part of chunk(sent ?? [], MAX_MEMORIES_PER_CALL)) {
    const jobs = await checkMemories(part.map((r) => r.job_id!));
    const byId = new Map(jobs.map((j) => [j.jobId, j]));
    saved += await saveJobResults(
      db,
      part,
      part.map((r) => byId.get(r.job_id!) ?? { jobId: r.job_id!, status: "pending" as const, blobId: null, error: null }),
      log,
    );
  }

  // New ones.
  const { data: pending, error } = await db
    .from("memories")
    .select("id, attempts, namespace, text")
    .eq("status", "pending")
    .order("created_at")
    .limit(SEND_PER_RUN);
  if (error) throw new Error(`loading queued memories: ${error.message}`);
  const sentNow: { id: string; attempts: number; jobId: string; namespace: string }[] = [];
  for (const part of chunk(pending ?? [], MAX_MEMORIES_PER_CALL)) {
    try {
      const jobIds = await sendMemories(part.map((m) => ({ text: m.text, namespace: m.namespace })));
      for (const [i, m] of part.entries()) {
        await db
          .from("memories")
          .update({ status: "sent", job_id: jobIds[i], attempts: m.attempts + 1, sent_at: new Date().toISOString() })
          .eq("id", m.id);
        sentNow.push({ id: m.id, attempts: m.attempts + 1, jobId: jobIds[i], namespace: m.namespace });
      }
    } catch (e) {
      log.push(`Couldn't send ${part.length} memory(ies) to Walrus, will retry (${e instanceof Error ? e.message : e})`);
    }
  }
  if (sentNow.length > 0) {
    const jobs = await waitForMemories(sentNow.map((m) => m.jobId), sentNow.map((m) => m.namespace), WAIT_MS);
    saved += await saveJobResults(db, sentNow, jobs, log);
  }

  if (saved > 0) log.push(`Saved ${saved} memory(ies) on Walrus Mainnet`);
  const stillSending = sentNow.length + (sent?.length ?? 0) - saved;
  if (stillSending > 0) log.push(`${stillSending} memory(ies) still being saved, checked next run`);
}

const CALL_COLUMNS =
  "id, version, pick, created_at, sui_status, sui_digest, content_hash, user_id, predictions!inner(home_team, away_team, league, kickoff_at, match_id)";

type CallRow = {
  id: string;
  version: number;
  pick: Call;
  created_at: string;
  sui_digest: string | null;
  content_hash: string;
  user_id: string;
  predictions: { home_team: string; away_team: string; league: string; kickoff_at: string; match_id: string | null };
};

/** The Walrus memory for one stamped call version. Only an anonymous fan id goes in, never a name or email. */
function callMemory(v: CallRow): NewMemory | null {
  if (!v.sui_digest || !v.predictions.match_id) return null;
  const p = v.predictions;
  const m: MatchInfo = { leagueName: p.league, homeTeam: p.home_team, awayTeam: p.away_team, kickoffAt: p.kickoff_at };
  const pickLabel = callLabel(v.pick, p.home_team, p.away_team);
  const fan = fanId(v.user_id);
  return {
    kind: "call",
    ref_key: v.id,
    namespace: NAMESPACES.call,
    fan_id: fan,
    summary: callSummary(m, pickLabel),
    text: callMemoryText(m, { fanId: fan, version: v.version, pickLabel, savedAt: v.created_at, suiDigest: v.sui_digest, contentHash: v.content_hash }),
  };
}

/** Stamped calls from the last 14 days that aren't queued for Walrus yet (a safety net for rememberCallNow). */
async function queueCallMemories(db: Db, since: string): Promise<NewMemory[]> {
  const { data, error } = await db
    .from("prediction_versions")
    .select(CALL_COLUMNS)
    .eq("sui_status", "stamped")
    .gte("created_at", since);
  if (error) throw new Error(`loading calls: ${error.message}`);
  const rows = (data ?? []) as unknown as CallRow[];
  const have = await existingKeys(db, "call", rows.map((r) => r.id));
  return rows.filter((r) => !have.has(r.id)).map(callMemory).filter((m): m is NewMemory => m !== null);
}

/**
 * Saves one call to Walrus right after its Sui stamp, so "Saved on Walrus" shows within a minute.
 * If anything fails, the row stays queued and the hourly job sends it.
 */
export async function rememberCallNow(db: Db, versionId: string) {
  const { data, error } = await db.from("prediction_versions").select(CALL_COLUMNS).eq("id", versionId).maybeSingle();
  if (error || !data) return;
  const memory = callMemory(data as unknown as CallRow);
  if (!memory) return;
  await db.from("memories").upsert(memory, { onConflict: "kind,ref_key", ignoreDuplicates: true });
  if (!walrusConfigured()) return;
  const { data: row } = await db
    .from("memories")
    .select("id, attempts, namespace, text, status")
    .eq("kind", "call")
    .eq("ref_key", versionId)
    .single();
  if (!row || row.status !== "pending") return;
  const [jobId] = await sendMemories([{ text: row.text, namespace: row.namespace }]);
  await db.from("memories").update({ status: "sent", job_id: jobId, attempts: row.attempts + 1, sent_at: new Date().toISOString() }).eq("id", row.id);
  const jobs = await waitForMemories([jobId], [row.namespace], 90_000);
  await saveJobResults(db, [{ id: row.id, attempts: row.attempts + 1 }], jobs, []);
}
