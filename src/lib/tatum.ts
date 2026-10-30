// Every call to Tatum lives here. Server and data job only (needs TATUM_API_KEY).
//
// Prediction Markets API (https://api.tatum.io/v4/data/prediction): Polymarket prices for football matches.
//   GET /events?status=active&search=...   find the match event
//   GET /markets?eventId=...     the three markets (home win, draw, away win) with live Yes prices
//
// Sui Mainnet through Tatum's gRPC gateway (sui-mainnet-grpc.gateway.tatum.io, key in x-api-key):
//   stampHashes()     records reading/pick hashes with our Move module (move/sources/stamp.move)
//   getAppBalance()   the app wallet's SUI balance, for the low-balance warning
//   publishPackage()  one-time publish of the Move module
import { ChannelCredentials } from "@grpc/grpc-js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Transaction } from "@mysten/sui/transactions";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { findMatchingEvent, mapMarkets, teamWords, type EventCandidate } from "./data-job/team-names";
import type { PolyPrices } from "./data-job/reading";
import { fetchWithRetry } from "./http";
import { hashToBytes, refToBytes, STAMP_KIND, type StampItem } from "./sui-stamp";
import { decodeStamped, type OnchainStamp } from "./stamp-check";

const PREDICTION_URL = "https://api.tatum.io/v4/data/prediction";

/** Free plan allows 3 requests a second. Keep a gap between calls. */
const MIN_GAP_MS = 400;
let lastCall = 0;

function apiKey(): string {
  const key = process.env.TATUM_API_KEY?.trim();
  if (!key) throw new Error("TATUM_API_KEY is missing");
  return key;
}

async function get<T>(path: string): Promise<T> {
  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const res = await fetchWithRetry(PREDICTION_URL + path, { headers: { "x-api-key": apiKey() } });
  if (!res.ok) throw new Error(`Tatum returned ${res.status} for ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

type TatumEvent = EventCandidate & { status: string; source?: { url?: string } };
type TatumMarket = {
  id: string;
  question: string;
  volume: number;
  outcomes: { name: string; price: number }[];
};

export type PolymarketLink = {
  eventId: string;
  title: string;
  url: string | null;
  markets: { home: string; draw: string; away: string };
};

/** Open Polymarket events whose title contains the text. (/search mixes in old closed events.) */
async function searchOpenEvents(q: string): Promise<TatumEvent[]> {
  const body = await get<{ data: TatumEvent[] }>(
    `/events?platform=polymarket&status=active&search=${encodeURIComponent(q)}&limit=100`,
  );
  return body.data.filter((e) => e.status === "active");
}

async function eventMarkets(eventId: string): Promise<TatumMarket[]> {
  const body = await get<{ data: TatumMarket[] }>(`/markets?eventId=${encodeURIComponent(eventId)}`);
  return body.data;
}

/**
 * Finds the Polymarket event for a match and which market is home, draw and away.
 * Returns null when there's no single clear match. We never guess.
 */
export async function findPolymarketMatch(match: {
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
}): Promise<PolymarketLink | null> {
  // Search by each full name, then by each team's longest word ("Bayern Munich" won't find
  // "FC Bayern München", but "Bayern" will). The match rules below still check both teams.
  const longestWord = (name: string) => [...teamWords(name)].sort((a, b) => b.length - a.length)[0];
  const queries = [match.homeTeam, match.awayTeam, longestWord(match.homeTeam), longestWord(match.awayTeam)];
  for (const q of [...new Set(queries.filter(Boolean))]) {
    const event = findMatchingEvent(match, await searchOpenEvents(q));
    if (!event) continue;
    const markets = mapMarkets(event.title, await eventMarkets(event.id));
    if (!markets) return null;
    return { eventId: event.id, title: event.title, url: event.source?.url ?? null, markets };
  }
  return null;
}

/** Live Yes prices for the three markets, plus total USD traded on them. */
export async function fetchPolymarketPrices(link: PolymarketLink): Promise<PolyPrices | null> {
  const markets = await eventMarkets(link.eventId);
  const fetchedAt = new Date().toISOString();
  const yes = (id: string) => markets.find((m) => m.id === id)?.outcomes.find((o) => o.name.toUpperCase() === "YES")?.price;
  const home = yes(link.markets.home);
  const draw = yes(link.markets.draw);
  const away = yes(link.markets.away);
  if (home == null || draw == null || away == null) return null;
  const ours = new Set(Object.values(link.markets));
  const volume = markets.filter((m) => ours.has(m.id)).reduce((sum, m) => sum + (Number(m.volume) || 0), 0);
  return { eventId: link.eventId, fetchedAt, volume, yes: { home, draw, away } };
}

// ---------------------------------------------------------------------------------------------
// Sui Mainnet (gRPC through Tatum)
// ---------------------------------------------------------------------------------------------

const SUI_GRPC_HOST = "sui-mainnet-grpc.gateway.tatum.io:443";

let sui: SuiGrpcClient | null = null;

/** Each gRPC request gives up after this long, so a dead connection fails fast and gets retried. */
const SUI_TIMEOUT_MS = 8_000;

/** A connection left unused this long is replaced rather than trusted (Tatum or the network may have closed it). */
const SUI_IDLE_MS = 60_000;
let suiLastUsed = 0;

/** Tatum's gateway speaks native gRPC (HTTP/2), so we use the grpc-js transport, not gRPC-web. */
export function suiClient(): SuiGrpcClient {
  if (sui && Date.now() - suiLastUsed > SUI_IDLE_MS) sui = null;
  suiLastUsed = Date.now();
  sui ??= new SuiGrpcClient({
    network: "mainnet",
    transport: new GrpcTransport({
      host: SUI_GRPC_HOST,
      channelCredentials: ChannelCredentials.createSsl(),
      meta: { "x-api-key": apiKey() },
      timeout: SUI_TIMEOUT_MS,
    }),
  });
  return sui;
}

/**
 * A connection kept open between requests can go stale (on Vercel the server sleeps between visits),
 * and its next request fails with ECONNRESET or a timeout. These are worth trying again on a new connection.
 */
export function isNetworkError(e: unknown): boolean {
  const text = `${(e as { code?: unknown })?.code ?? ""} ${e instanceof Error ? e.message : String(e)}`;
  return /ECONNRESET|ETIMEDOUT|EPIPE|ECONNREFUSED|socket hang up|UNAVAILABLE|DEADLINE_EXCEEDED|deadline|GOAWAY|RST_STREAM|Connection dropped|network/i.test(text);
}

/** Runs `fn`. On a network error, drops the connection, opens a new one and tries again (3 tries in all). */
export async function withFreshConnection<T>(fn: (client: SuiGrpcClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(suiClient());
    } catch (e) {
      if (attempt >= 3 || !isNetworkError(e)) throw e;
      console.warn(`Sui connection failed (${e instanceof Error ? e.message : e}), retrying on a new one`);
      sui = null;
    }
  }
}

/** The app wallet. Its private key lives only in .env.local / GitHub secrets. */
export function appKeypair(): Ed25519Keypair {
  const secret = process.env.SUI_APP_PRIVATE_KEY?.trim();
  if (!secret || secret.includes("your-")) throw new Error("SUI_APP_PRIVATE_KEY is missing");
  return Ed25519Keypair.fromSecretKey(secret);
}

export function stampPackageId(): string {
  const id = process.env.SUI_PACKAGE_ID?.trim();
  if (!id || !/^0x[0-9a-f]{64}$/.test(id)) throw new Error("SUI_PACKAGE_ID is missing");
  return id;
}

/** True when the wallet key and package id are both set, so stamping can run. */
export function stampingConfigured(): boolean {
  try {
    appKeypair();
    stampPackageId();
    return true;
  } catch {
    return false;
  }
}

export async function getAppBalance(): Promise<{ address: string; mist: bigint }> {
  const address = appKeypair().toSuiAddress();
  const res = await suiClient().core.getBalance({ owner: address });
  return { address, mist: BigInt(res.balance.balance) };
}

const STAMP_GAS_BUDGET_MIST = 50_000_000;

/**
 * Stamps up to MAX_STAMPS_PER_TX hashes in one Sui transaction. Each becomes its own
 * `Stamped` event. Returns the transaction digest, or throws if Sui rejects it.
 */
export async function stampHashes(items: StampItem[]): Promise<{ digest: string }> {
  if (items.length === 0) throw new Error("Nothing to stamp");
  const signer = appKeypair();
  const target = `${stampPackageId()}::stamp::record`;

  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  // A fixed gas limit saves a trial run before every stamp. Only the gas used is charged:
  // 11 stamps cost 0.0001 SUI, so 0.05 SUI covers a full batch of 100 many times over.
  tx.setGasBudget(STAMP_GAS_BUDGET_MIST);
  for (const item of items) {
    tx.moveCall({
      target,
      arguments: [
        tx.pure.u8(STAMP_KIND[item.kind]),
        tx.pure.vector("u8", hashToBytes(item.hash)),
        tx.pure.vector("u8", refToBytes(item.refId)),
        tx.object.clock(),
      ],
    });
  }

  // Build and sign once. If sending fails on a network error we send the same signed bytes again:
  // Sui runs a transaction only once, so a resend can never stamp twice.
  const bytes = await withFreshConnection((client) => tx.build({ client }));
  const { signature } = await signer.signTransaction(bytes);
  const result = await withFreshConnection((client) => client.core.executeTransaction({ transaction: bytes, signatures: [signature] }));
  if (result.$kind === "FailedTransaction") {
    const t = result.FailedTransaction;
    throw new Error(`Sui rejected the stamp transaction ${t.digest}: ${JSON.stringify(t.status.error)}`);
  }
  return { digest: result.Transaction.digest };
}

/**
 * Reads a stamp transaction back from Sui Mainnet through Tatum: when the chain says it ran, and every `Stamped`
 * event from our Move package in it. Used by "Check this stamp" on the Proof page.
 */
export async function readStamps(digest: string): Promise<{ timestampMs: number | null; stamps: OnchainStamp[] }> {
  const res = await withFreshConnection((client) => client.core.getTransaction({ digest, include: { events: true } }));
  const tx = res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;
  const type = `${stampPackageId()}::stamp::Stamped`;
  const stamps = (tx.events ?? []).filter((e) => e.eventType === type).map((e) => decodeStamped(e.bcs));
  return { timestampMs: tx.timestampMs ?? null, stamps };
}

/** One-time: publish the Move module. Returns the new package id. */
export async function publishPackage(modules: string[], dependencies: string[]): Promise<{ packageId: string; digest: string }> {
  const signer = appKeypair();
  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  const upgradeCap = tx.publish({ modules, dependencies });
  tx.transferObjects([upgradeCap], signer.toSuiAddress());

  const result = await suiClient().core.signAndExecuteTransaction({
    transaction: tx,
    signer,
    include: { effects: true },
  });
  if (result.$kind === "FailedTransaction") {
    throw new Error(`Publish failed: ${JSON.stringify(result.FailedTransaction.status.error)}`);
  }
  const pkg = result.Transaction.effects.changedObjects.find((o) => o.outputState === "PackageWrite");
  if (!pkg) throw new Error(`Published, but no package id found in transaction ${result.Transaction.digest}`);
  return { packageId: pkg.objectId, digest: result.Transaction.digest };
}

/**
 * Opens the gRPC connection to Tatum ahead of time. The first request on a fresh connection takes
 * about 2.7 seconds; later ones about 0.3. Fire and forget: a failure here just means no head start.
 */
export function warmUpSui(): void {
  if (!stampingConfigured()) return;
  const client = suiClient();
  client.core.getReferenceGasPrice().catch(() => {
    if (sui === client) sui = null; // don't let the stamp reuse a connection that just failed
  });
}
