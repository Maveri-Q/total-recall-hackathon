// Reads and writes the prediction journal as the signed-in user.
// The database itself enforces the kickoff lock and version order (see supabase/migrations).
import "server-only";
import { randomUUID } from "node:crypto";
import { commitmentHash } from "./commitment";
import type { MatchInput, Pick, PickInput } from "./prediction-input";
import { createClient } from "./supabase/server";

export type PredictionVersion = {
  id: string;
  version: number;
  pick: Pick;
  confidence: number;
  reason: string;
  source: string | null;
  content_hash: string;
  created_at: string;
  sui_status: "pending" | "stamped" | "failed" | "not_applicable";
  sui_digest: string | null;
};

export type Prediction = {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff_at: string;
  origin: "app" | "imported";
  created_at: string;
  /** Oldest first. The last one is the current pick. */
  versions: PredictionVersion[];
};

const SELECT = `id, home_team, away_team, league, kickoff_at, origin, created_at,
  versions:prediction_versions (id, version, pick, confidence, reason, source, content_hash, created_at, sui_status, sui_digest)`;

/** Turns database errors into plain messages. Unknown errors keep a short generic text. */
export function journalErrorText(message: string | undefined): string {
  if (message?.includes("prediction_locked")) return "Too late. This match has kicked off, so the pick is locked.";
  if (message?.includes("prediction_version_conflict") || message?.includes("duplicate key")) {
    return "This pick was changed somewhere else. Reload the page and try again.";
  }
  return "Couldn't save the pick. Try again in a moment.";
}

function sortVersions(p: Prediction): Prediction {
  return { ...p, versions: [...p.versions].sort((a, b) => a.version - b.version) };
}

export async function listPredictions(): Promise<Prediction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select(SELECT)
    .order("kickoff_at", { ascending: false });
  if (error) throw new Error(`Couldn't load picks: ${error.message}`);
  return (data as Prediction[]).map(sortVersions);
}

export async function getPrediction(id: string): Promise<Prediction | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("predictions").select(SELECT).eq("id", id).maybeSingle();
  if (error) {
    // A malformed id is just "not found" to the user.
    if (error.code === "22P02") return null;
    throw new Error(`Couldn't load the pick: ${error.message}`);
  }
  return data ? sortVersions(data as Prediction) : null;
}

export async function createPrediction(
  match: MatchInput,
  pick: PickInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const id = randomUUID();
  const hash = commitmentHash({ predictionId: id, version: 1, ...match, ...pick });

  const { error } = await supabase.rpc("create_prediction", {
    p_id: id,
    p_home_team: match.homeTeam,
    p_away_team: match.awayTeam,
    p_league: match.league,
    p_kickoff_at: match.kickoffAt,
    p_external_match_id: match.externalMatchId,
    p_pick: pick.pick,
    p_confidence: pick.confidence,
    p_reason: pick.reason,
    p_source: pick.source,
    p_content_hash: hash,
  });
  if (error) return { ok: false, error: journalErrorText(error.message) };
  return { ok: true, id };
}

/** Saves a new version. `version` must be exactly one more than the latest saved version. */
export async function addVersion(
  prediction: Prediction,
  version: number,
  pick: PickInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const hash = commitmentHash({
    predictionId: prediction.id,
    version,
    homeTeam: prediction.home_team,
    awayTeam: prediction.away_team,
    league: prediction.league,
    kickoffAt: prediction.kickoff_at,
    ...pick,
  });

  const { error } = await supabase.from("prediction_versions").insert({
    prediction_id: prediction.id,
    version,
    pick: pick.pick,
    confidence: pick.confidence,
    reason: pick.reason,
    source: pick.source,
    content_hash: hash,
  });
  if (error) return { ok: false, error: journalErrorText(error.message) };
  return { ok: true };
}
