// "Your call": reads and saves the signed-in user's calls, and stamps each one on Sui.
// The database enforces the kickoff lock, version order and daily limit (see supabase/migrations).
import "server-only";
import { after } from "next/server";
import { randomUUID } from "node:crypto";
import { callOutcome, type Call, type CallOutcome } from "./call-result";
import { commitmentHash } from "./commitment";
import { leagueByCode } from "./leagues";
import type { Outcome } from "./odds";
import { rememberCallNow } from "./data-job/remember";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { stampHashes, stampingConfigured, warmUpSui } from "./tatum";

export type CallVersion = {
  id: string;
  version: number;
  pick: Call;
  created_at: string;
  sui_status: "pending" | "stamped" | "failed" | "not_applicable";
  sui_digest: string | null;
  stamped_at: string | null;
  content_hash: string;
  /** The call's Walrus memory, once one exists. */
  walrus?: { status: "pending" | "sent" | "saved" | "failed"; blobId: string | null } | null;
};

type Game = { result: Outcome | null; result_status: string | null; home_goals: number | null; away_goals: number | null };

export type MyCall = {
  id: string;
  matchId: string | null;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffAt: string;
  /** Oldest first. The last one is the call that counts. */
  versions: CallVersion[];
  game: Game | null;
  outcome: CallOutcome;
};

const SELECT = `id, match_id, home_team, away_team, league, kickoff_at,
  versions:prediction_versions (id, version, pick, created_at, sui_status, sui_digest, stamped_at, content_hash),
  game:matches (result, result_status, home_goals, away_goals)`;

type Row = {
  id: string;
  match_id: string | null;
  home_team: string;
  away_team: string;
  league: string;
  kickoff_at: string;
  versions: CallVersion[];
  game: Game | null;
};

function toCall(r: Row, now: Date): MyCall {
  const versions = [...r.versions].sort((a, b) => a.version - b.version);
  return {
    id: r.id,
    matchId: r.match_id,
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    league: r.league,
    kickoffAt: r.kickoff_at,
    versions,
    game: r.game,
    outcome: callOutcome(versions.at(-1)!.pick, r.kickoff_at, r.game, now),
  };
}

/** All the user's calls, newest game first. */
export async function listMyCalls(now: Date = new Date()): Promise<MyCall[]> {
  const { data, error } = await (await createClient())
    .from("predictions")
    .select(SELECT)
    .order("kickoff_at", { ascending: false });
  if (error) throw new Error(`Couldn't load calls: ${error.message}`);
  return withWalrus((data as unknown as Row[]).filter((r) => r.versions.length > 0).map((r) => toCall(r, now)));
}

/** The user's call on each of these games, by game id. */
export async function myCallsOn(matchIds: string[], now: Date = new Date(), { walrus = true } = {}): Promise<Map<string, MyCall>> {
  if (matchIds.length === 0) return new Map();
  const { data, error } = await (await createClient()).from("predictions").select(SELECT).in("match_id", matchIds);
  if (error) throw new Error(`Couldn't load calls: ${error.message}`);
  const rows = (data as unknown as Row[]).filter((r) => r.versions.length > 0).map((r) => toCall(r, now));
  const calls = walrus ? await withWalrus(rows) : rows;
  return new Map(calls.map((c) => [c.matchId!, c]));
}

function errorText(message: string | undefined): string {
  if (message?.includes("prediction_locked")) return "Too late. This game has kicked off.";
  if (message?.includes("daily_limit")) return "That's 30 calls in a day. Try again tomorrow.";
  if (message?.includes("prediction_version_conflict") || message?.includes("duplicate key")) {
    return "Your call changed somewhere else. Reload the page and try again.";
  }
  return "Couldn't save your call. Try again in a moment.";
}

/**
 * Saves a call (or a change to it) on one game and stamps it on Sui before answering, so the proof
 * is from before kickoff. If the stamp fails, the call is still saved and the hourly job retries.
 */
export type CallResult =
  | { ok: true; stamp: { digest: string; stampedAt: string } | null }
  | { ok: false; error: string };

export async function makeCall(userId: string, matchId: string, pick: Call): Promise<CallResult> {
  const started = Date.now();
  // Open the Sui connection now, so it is ready by the time the call is saved and needs stamping.
  warmUpSui();
  const supabase = await createClient();
  // The game and any earlier call on it, side by side (each is a round trip to the database).
  const [{ data: match, error: matchError }, mine] = await Promise.all([
    supabase.from("matches").select("id, league_code, home_team, away_team, kickoff_at").eq("id", matchId).maybeSingle(),
    myCallsOn([matchId], new Date(), { walrus: false }),
  ]);
  if (matchError || !match) return { ok: false, error: "We couldn't find this game." };
  if (Date.now() >= Date.parse(match.kickoff_at)) return { ok: false, error: "Too late. This game has kicked off." };

  const existing = mine.get(matchId);
  const latest = existing?.versions.at(-1);
  if (latest?.pick === pick) {
    return { ok: true, stamp: latest.sui_digest && latest.stamped_at ? { digest: latest.sui_digest, stampedAt: latest.stamped_at } : null };
  }

  const predictionId = existing?.id ?? randomUUID();
  const version = (latest?.version ?? 0) + 1;
  const league = existing?.league ?? leagueByCode(match.league_code)?.name ?? match.league_code;
  const hash = commitmentHash({
    predictionId,
    version,
    homeTeam: existing?.homeTeam ?? match.home_team,
    awayTeam: existing?.awayTeam ?? match.away_team,
    league,
    kickoffAt: existing?.kickoffAt ?? match.kickoff_at,
    pick,
    confidence: null,
    reason: null,
    source: null,
  });

  // A change gets its id here, so stamping doesn't need to look it up. A first call's id comes from create_call.
  const versionId = existing ? randomUUID() : undefined;
  const { error } = existing
    ? await supabase.from("prediction_versions").insert({ id: versionId, prediction_id: predictionId, user_id: userId, version, pick, content_hash: hash })
    : await supabase.rpc("create_call", { p_id: predictionId, p_match_id: matchId, p_league: league, p_pick: pick, p_content_hash: hash });
  if (error) {
    console.error("makeCall", error.message);
    return { ok: false, error: errorText(error.message) };
  }

  const saved = Date.now();
  // Stamp now and answer as soon as Sui confirms (about a second). Walrus is saved afterwards, in the background.
  const stamp = await stampCallVersion(predictionId, version, hash, versionId);
  console.log(`[call] saved in ${saved - started}ms, stamped on Sui in ${Date.now() - saved}ms, total ${Date.now() - started}ms`);
  return { ok: true, stamp };
}

/**
 * Stamps one call version on Sui and returns once Sui confirms it. Then saves it to Walrus in the background
 * (the hourly job retries anything that didn't make it). Uses the secret key: users can't change stamp fields.
 */
async function stampCallVersion(
  predictionId: string,
  version: number,
  hash: string,
  knownId?: string,
): Promise<{ digest: string; stampedAt: string } | null> {
  const admin = createAdminClient();
  const row = knownId
    ? { id: knownId }
    : (await admin.from("prediction_versions").select("id").eq("prediction_id", predictionId).eq("version", version).single()).data;
  if (!row || !stampingConfigured()) return null;
  try {
    const { digest } = await stampHashes([{ kind: "pick", hash, refId: row.id }]);
    const stampedAt = new Date().toISOString();
    await admin.from("prediction_versions").update({ sui_status: "stamped", sui_digest: digest, stamped_at: stampedAt, sui_error: null }).eq("id", row.id);
    after(async () => {
      const t = Date.now();
      await rememberCallNow(admin, row.id).catch((e) => console.error("remember call", e instanceof Error ? e.message : e));
      console.log(`[call] saved on Walrus in ${Date.now() - t}ms`);
    });
    return { digest, stampedAt };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("stamp call", message);
    await admin.from("prediction_versions").update({ sui_status: "failed", sui_error: message.slice(0, 500) }).eq("id", row.id);
    return null;
  }
}

/** "Try again" after a failed stamp: stamps the user's latest call on this game again. */
export async function retryCallStamp(matchId: string): Promise<CallResult> {
  const call = (await myCallsOn([matchId])).get(matchId);
  const latest = call?.versions.at(-1);
  if (!call || !latest) return { ok: false, error: "We couldn't find your call." };
  if (latest.sui_status === "stamped" && latest.sui_digest && latest.stamped_at) {
    return { ok: true, stamp: { digest: latest.sui_digest, stampedAt: latest.stamped_at } };
  }
  if (Date.now() >= Date.parse(call.kickoffAt)) return { ok: false, error: "Too late. This game has kicked off." };
  warmUpSui();
  return { ok: true, stamp: await stampCallVersion(call.id, latest.version, latest.content_hash) };
}

/** Adds each call version's Walrus memory status (calls are saved to Walrus after their Sui stamp). */
async function withWalrus<T extends { versions: CallVersion[] }>(calls: T[]): Promise<T[]> {
  const ids = calls.flatMap((c) => c.versions.map((v) => v.id));
  if (ids.length === 0) return calls;
  const { data } = await createAdminClient().from("memories").select("ref_key, status, blob_id").eq("kind", "call").in("ref_key", ids);
  const byId = new Map((data ?? []).map((m) => [m.ref_key, { status: m.status, blobId: m.blob_id }]));
  for (const c of calls) for (const v of c.versions) v.walrus = byId.get(v.id) ?? null;
  return calls;
}
