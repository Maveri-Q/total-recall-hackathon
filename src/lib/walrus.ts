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
