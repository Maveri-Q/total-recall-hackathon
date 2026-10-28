// Every Walrus Memory call lives here.
// Uses the Walrus Foundation's Mainnet relayer, which pays the WAL storage fees and SUI gas.
// The relayer sees what we save, so only public data goes in: odds, prices, results and grades.
import type { MemWal } from "@mysten-incubation/memwal";

let client: MemWal | null = null;

export function walrusConfigured(): boolean {
  const key = process.env.MEMWAL_DELEGATE_KEY ?? "";
  const account = process.env.MEMWAL_ACCOUNT_ID ?? "";
  return key.length > 0 && !key.startsWith("your-") && /^0x[0-9a-f]{64}$/.test(account);
}

/** The Walrus Memory client. Server-side only: it holds the delegate key. */
export async function memwal(): Promise<MemWal> {
  if (!walrusConfigured()) throw new Error("Walrus Memory isn't set up (MEMWAL_DELEGATE_KEY or MEMWAL_ACCOUNT_ID missing)");
  // The SDK is ESM-only, and the data job's scripts load src/ as CommonJS, so it's imported on first use.
  const { MemWal } = await import("@mysten-incubation/memwal");
  client ??= MemWal.create({
    key: process.env.MEMWAL_DELEGATE_KEY!,
    accountId: process.env.MEMWAL_ACCOUNT_ID!,
    serverUrl: process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz",
    namespace: "total-recall",
  });
  return client;
}

/** The relayer takes at most 20 memories per bulk call. */
export const MAX_MEMORIES_PER_CALL = 20;

export type MemoryJob = { jobId: string; status: "done" | "failed" | "pending"; blobId: string | null; error: string | null };

/** Hands up to 20 memories to the relayer. Returns one job id per item, in order. */
export async function sendMemories(items: { text: string; namespace: string }[]): Promise<string[]> {
  const accepted = await (await memwal()).rememberBulk(items);
  if (accepted.job_ids.length !== items.length) {
    throw new Error(`Walrus accepted ${accepted.job_ids.length} of ${items.length} memories`);
  }
  return accepted.job_ids;
}

/** Waits up to `timeoutMs` for memory jobs to finish. Jobs still running come back as "pending". */
export async function waitForMemories(jobIds: string[], namespaces: string[], timeoutMs: number): Promise<MemoryJob[]> {
  const { results } = await (await memwal()).waitForRememberJobs(jobIds, namespaces, { timeoutMs });
  return results.map((r) => ({
    jobId: r.id,
    status: r.status === "timeout" ? "pending" : r.status,
    blobId: r.blob_id || null,
    error: r.status === "failed" ? (r.error ?? "failed") : null,
  }));
}

/** One look at jobs sent in an earlier run. */
export async function checkMemories(jobIds: string[]): Promise<MemoryJob[]> {
  const { results } = await (await memwal()).getRememberBulkStatus(jobIds);
  return results.map((r) => ({
    jobId: r.job_id,
    status: r.status === "done" ? "done" : r.status === "failed" || r.status === "not_found" ? "failed" : "pending",
    blobId: r.blob_id ?? null,
    error: r.status === "failed" || r.status === "not_found" ? (r.error ?? r.status) : null,
  }));
}

export type RecalledMemory = { text: string; blobId: string; distance: number; savedAt: string | null };

/** The memories in a namespace closest in meaning to `query`, nearest first. */
export async function recallMemories(query: string, namespace: string, limit = 5): Promise<RecalledMemory[]> {
  const { results } = await (await memwal()).recall(query, { namespace, limit });
  return results.map((m) => ({
    text: m.text,
    blobId: m.blob_id,
    distance: m.distance,
    savedAt: m.created_at ?? null,
  }));
}
