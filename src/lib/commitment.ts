// The commitment hash for one prediction version. Only this hash goes onchain.
// Anyone with the saved record can recompute it and check it against the Sui transaction.
import { createHash } from "node:crypto";
import type { Pick } from "./prediction-input";

export const COMMITMENT_SCHEMA = "total-recall/prediction/v1";

export type CommitmentFields = {
  predictionId: string;
  version: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffAt: string;
  pick: Pick;
  confidence: number;
  reason: string;
  source: string | null;
};

/** Fixed field order and UTC kickoff, so the same record always gives the same hash. */
export function commitmentPayload(f: CommitmentFields): string {
  return JSON.stringify([
    COMMITMENT_SCHEMA,
    f.predictionId,
    f.version,
    f.homeTeam,
    f.awayTeam,
    f.league,
    new Date(f.kickoffAt).toISOString(),
    f.pick,
    f.confidence,
    f.reason,
    f.source,
  ]);
}

export function commitmentHash(f: CommitmentFields): string {
  return createHash("sha256").update(commitmentPayload(f), "utf8").digest("hex");
}
