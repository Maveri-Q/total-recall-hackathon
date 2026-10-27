// Pure helpers for stamping hashes on Sui. The network calls are in tatum.ts.

export const STAMP_KIND = { reading: 1, pick: 2 } as const;
export type StampKind = keyof typeof STAMP_KIND;

export type StampItem = { kind: StampKind; hash: string; refId: string };

/** One transaction can hold many stamps. Keep batches small enough to stay well under Sui's limits. */
export const MAX_STAMPS_PER_TX = 100;

/** Below this the owner gets a warning in the job log: 0.5 SUI, in MIST (1 SUI = 1,000,000,000 MIST). */
export const LOW_BALANCE_MIST = 500_000_000n;

export function hashToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("A stamp hash must be 64 lowercase hex characters");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function refToBytes(refId: string): Uint8Array {
  const bytes = new TextEncoder().encode(refId);
  if (bytes.length > 64) throw new Error("A stamp ref id must be 64 bytes or fewer");
  return bytes;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function explorerTxUrl(digest: string): string {
  return `https://suiscan.xyz/mainnet/tx/${digest}`;
}

export function mistToSui(mist: bigint): string {
  const whole = mist / 1_000_000_000n;
  const frac = (mist % 1_000_000_000n).toString().padStart(9, "0").slice(0, 4);
  return `${whole}.${frac}`;
}
