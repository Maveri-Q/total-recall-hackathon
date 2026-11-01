// Pure helpers for stamping hashes on Sui. The network calls are in tatum.ts.

export const STAMP_KIND = { reading: 1, pick: 2 } as const;
export type StampKind = keyof typeof STAMP_KIND;

export type StampItem = { kind: StampKind; hash: string; refId: string };

/** One transaction can hold many stamps. Keep batches small enough to stay well under Sui's limits. */
export const MAX_STAMPS_PER_TX = 100;

/** Below this the owner gets a warning in the job log: 0.5 SUI, in MIST (1 SUI = 1,000,000,000 MIST). */
export const LOW_BALANCE_MIST = 500_000_000n;

/**
 * The gas limit set on every stamp transaction: 0.005 SUI. Sui only charges the gas actually used, but it refuses
 * a transaction unless the wallet holds the full limit, so this is also the least the wallet needs to stamp at all.
 */
export const STAMP_GAS_BUDGET_MIST = 5_000_000n;

/**
 * What one stamp transaction really costs, measured on Mainnet on 1 Nov 2026: 100,000 MIST (0.0001 SUI) for every
 * one of 14 recent transactions, whether it held 1 stamp or 6.
 */
export const STAMP_TX_COST_MIST = 100_000n;

/** Whether the wallet can pay for a stamp right now. */
export function canStamp(balanceMist: bigint): boolean {
  return balanceMist >= STAMP_GAS_BUDGET_MIST;
}

/** Roughly how many more stamp transactions the balance covers (each call is one; readings share one per run). */
export function stampsLeft(balanceMist: bigint): number {
  return canStamp(balanceMist) ? Number(balanceMist / STAMP_TX_COST_MIST) : 0;
}

/** Sui refused the transaction because the app wallet can't pay for it. Anything else is a different failure. */
export function isOutOfGas(e: unknown): boolean {
  const text = e instanceof Error ? e.message : String(e);
  return /InsufficientGas|GasBalanceTooLow|No valid gas coins|lower than the needed amount|insufficient (sui|gas|balance|coin)/i.test(text);
}

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

/**
 * Whether a stamp proves the record existed before the game. One stamped after kickoff (for example after the
 * wallet was topped up) is still on Sui, but it's labelled "stamped after kickoff" and not counted as a stamp.
 */
export function stampedBeforeKickoff(stampedAt: string, kickoffAt: string): boolean {
  return Date.parse(stampedAt) < Date.parse(kickoffAt);
}
