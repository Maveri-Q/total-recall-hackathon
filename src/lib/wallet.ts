// The app wallet that pays for every Sui stamp, as shown on the Proof page: its address, balance and roughly
// how many more stamps that covers. The balance is read through Tatum's Sui gateway (tatum.ts).
import "server-only";
import { cacheLife } from "next/cache";
import { canStamp, LOW_BALANCE_MIST, mistToSui, STAMP_TX_COST_MIST, stampsLeft } from "./sui-stamp";
import { getAppBalance } from "./tatum";

export type WalletStatus = {
  address: string;
  balanceSui: string;
  costPerStampSui: string;
  stampsLeft: number;
  /** Under 0.5 SUI: the owner is warned to top up. */
  low: boolean;
  /** Under the gas limit: new stamps wait until a top-up. */
  canStamp: boolean;
};

/** Cached for a few minutes, so the Proof page doesn't ask Sui on every visit. */
export async function getWalletStatus(): Promise<WalletStatus> {
  "use cache";
  cacheLife({ stale: 120, revalidate: 300, expire: 3600 });
  const { address, mist } = await getAppBalance();
  return {
    address,
    balanceSui: mistToSui(mist),
    costPerStampSui: mistToSui(STAMP_TX_COST_MIST),
    stampsLeft: stampsLeft(mist),
    low: mist < LOW_BALANCE_MIST,
    canStamp: canStamp(mist),
  };
}
