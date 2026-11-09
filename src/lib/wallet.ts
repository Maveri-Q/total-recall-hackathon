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

/** Asks Sui (through Tatum) at most once an hour, so page visits don't use up Tatum credits. */
export async function getWalletStatus(): Promise<WalletStatus> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 7200 });
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
