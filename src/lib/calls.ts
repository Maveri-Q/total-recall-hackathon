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
export async function myCallsOn(matchIds: string[], now: Date = new Date()): Promise<Map<string, MyCall>> {
  if (matchIds.length === 0) return new Map();
  const { data, error } = await (await createClient()).from("predictions").select(SELECT).in("match_id", matchIds);
  if (error) throw new Error(`Couldn't load calls: ${error.message}`);
  const calls = await withWalrus((data as unknown as Row[]).filter((r) => r.versions.length > 0).map((r) => toCall(r, now)));
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
 * Saves a call (or a change to it) on one game, then stamps it on Sui within seconds so the proof
 * is from before kickoff. If the stamp fails, the call is still saved and the hourly job retries.
 */
export async function makeCall(userId: string, matchId: string, pick: Call): Promise<{ ok: true } | { ok: false; error: string }> {
  // Open the Sui connection now, so it is ready by the time the call is saved and needs stamping.
  warmUpSui();
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, league_code, home_team, away_team, kickoff_at")
    .eq("id", matchId)
    .maybeSingle();
  if (matchError || !match) return { ok: false, error: "We couldn't find this game." };
  if (Date.now() >= Date.parse(match.kickoff_at)) return { ok: false, error: "Too late. This game has kicked off." };

  const existing = (await myCallsOn([matchId])).get(matchId);
  const latest = existing?.versions.at(-1);
  if (latest?.pick === pick) return { ok: true };

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

  const { error } = existing
    ? await supabase.from("prediction_versions").insert({ prediction_id: predictionId, user_id: userId, version, pick, content_hash: hash })
    : await supabase.rpc("create_call", { p_id: predictionId, p_match_id: matchId, p_league: league, p_pick: pick, p_content_hash: hash });
  if (error) {
    console.error("makeCall", error.message);
    return { ok: false, error: errorText(error.message) };
  }

  // Stamp once the tap has answered, so the button responds straight away. The page checks back for the proof.
  after(() => stampCallVersion(predictionId, version, hash));
  return { ok: true };
}

/** Stamps one call version on Sui. Uses the secret key: users can't change stamp fields themselves. */
async function stampCallVersion(predictionId: string, version: number, hash: string) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("prediction_versions")
    .select("id")
    .eq("prediction_id", predictionId)
    .eq("version", version)
    .single();
  if (!row || !stampingConfigured()) return;
  try {
    const { digest } = await stampHashes([{ kind: "pick", hash, refId: row.id }]);
    await admin
      .from("prediction_versions")
      .update({ sui_status: "stamped", sui_digest: digest, stamped_at: new Date().toISOString(), sui_error: null })
      .eq("id", row.id);
    // Then remember it on Walrus. A failure here only delays it: the hourly job sends anything left queued.
    await rememberCallNow(admin, row.id).catch((e) => console.error("remember call", e instanceof Error ? e.message : e));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("stamp call", message);
    await admin.from("prediction_versions").update({ sui_status: "failed", sui_error: message.slice(0, 500) }).eq("id", row.id);
  }
}

/** "Try again" after a failed stamp: stamps the user's latest call on this game again. */
export async function retryCallStamp(matchId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const call = (await myCallsOn([matchId])).get(matchId);
  const latest = call?.versions.at(-1);
  if (!call || !latest) return { ok: false, error: "We couldn't find your call." };
  if (latest.sui_status === "stamped") return { ok: true };
  if (Date.now() >= Date.parse(call.kickoffAt)) return { ok: false, error: "Too late. This game has kicked off." };
  warmUpSui();
  after(() => stampCallVersion(call.id, latest.version, latest.content_hash));
  return { ok: true };
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
