// One run of the data job. GitHub Actions calls this every hour (see scripts/data-job.ts).
//
// 1. List upcoming matches in each league (free call) and save them.
// 2. Work out which matches are due a reading (see schedule.ts).
// 3. For each league with a due match: fetch bookie odds (1 credit), then straight away the
//    Polymarket prices for those matches, so both readings are from the same moment.
// 4. Save each reading with its hash.
// 5. Stamp the new readings' hashes on Sui Mainnet through Tatum.
import { LEAGUES } from "../leagues";
import { fetchLeagueOdds, listEvents } from "../odds-api";
import { createAdminClient } from "../supabase/admin";
import { chunk, explorerTxUrl, LOW_BALANCE_MIST, MAX_STAMPS_PER_TX, mistToSui } from "../sui-stamp";
import {
  fetchPolymarketPrices,
  findPolymarketMatch,
  getAppBalance,
  stampHashes,
  stampingConfigured,
  type PolymarketLink,
} from "../tatum";
import { buildReading } from "./reading";
import { dueReadings, type ReadingKind } from "./schedule";

/** Only matches this close are saved; nothing further away can be due. */
const LOOKAHEAD_MS = 26 * 60 * 60 * 1000;

type MatchRow = {
  id: string;
  league_code: string;
  odds_api_id: string;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  polymarket_status: "unchecked" | "matched" | "not_found";
  polymarket_event_id: string | null;
  polymarket_title: string | null;
  polymarket_url: string | null;
  polymarket_markets: PolymarketLink["markets"] | null;
};

export type RunSummary = {
  readingsSaved: number;
  creditsUsed: number;
  creditsRemaining: number | null;
  log: string[];
};

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const STAMP_RETRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Stamps every reading that isn't on Sui yet, in batches of up to 100 per transaction.
 * A failed batch is marked "failed" and tried again on the next run.
 */
async function stampPendingReadings(db: ReturnType<typeof createAdminClient>, now: Date, log: string[]) {
  if (!stampingConfigured()) {
    log.push("Sui stamping isn't set up yet (wallet key or package id missing). Readings stay unstamped.");
    return;
  }
  try {
    const { address, mist } = await getAppBalance();
    if (mist < LOW_BALANCE_MIST) {
      log.push(`WARNING: app wallet ${address} is low on SUI (${mistToSui(mist)} SUI left). Top it up.`);
    }
  } catch (e) {
    log.push(`Couldn't check the app wallet balance (${errorText(e)})`);
  }

  const { data: pending, error } = await db
    .from("readings")
    .select("id, content_hash")
    .in("sui_status", ["pending", "failed"])
    .gte("taken_at", new Date(now.getTime() - STAMP_RETRY_WINDOW_MS).toISOString())
    .order("taken_at", { ascending: true })
    .limit(MAX_STAMPS_PER_TX * 3);
  if (error) {
    log.push(`Couldn't load readings to stamp (${error.message})`);
    return;
  }

  for (const batch of chunk(pending ?? [], MAX_STAMPS_PER_TX)) {
    const ids = batch.map((r) => r.id);
    try {
      const { digest } = await stampHashes(batch.map((r) => ({ kind: "reading", hash: r.content_hash, refId: r.id })));
      await db
        .from("readings")
        .update({ sui_status: "stamped", sui_digest: digest, stamped_at: new Date().toISOString() })
        .in("id", ids);
      log.push(`Stamped ${batch.length} reading(s) on Sui: ${explorerTxUrl(digest)}`);
    } catch (e) {
      await db.from("readings").update({ sui_status: "failed" }).in("id", ids);
      log.push(`Sui stamp failed for ${batch.length} reading(s), will retry next run (${errorText(e)})`);
    }
  }
}

export async function runDataJob(now: Date = new Date()): Promise<RunSummary> {
  const db = createAdminClient();
  const log: string[] = [];
  let readingsSaved = 0;
  let creditsUsed = 0;

  const { data: run, error: runError } = await db.from("job_runs").insert({}).select("id").single();
  if (runError) throw new Error(`Couldn't start the job log: ${runError.message}`);

  // Credits left this month, from the last run in the same UTC month. Null if unknown.
  const { data: lastRun } = await db
    .from("job_runs")
    .select("started_at, odds_credits_remaining")
    .not("odds_credits_remaining", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sameMonth = lastRun && lastRun.started_at.slice(0, 7) === now.toISOString().slice(0, 7);
  let creditsRemaining: number | null = sameMonth ? lastRun.odds_credits_remaining : null;

  try {
    for (const league of LEAGUES) {
      try {
        // 1. Upcoming matches (free).
        const events = (await listEvents(league.oddsApiKey)).filter((e) => {
          const until = new Date(e.kickoffAt).getTime() - now.getTime();
          return until > 0 && until <= LOOKAHEAD_MS;
        });
        if (events.length === 0) continue;

        const { data: rows, error: upsertError } = await db
          .from("matches")
          .upsert(
            events.map((e) => ({
              league_code: league.code,
              odds_api_id: e.id,
              home_team: e.homeTeam,
              away_team: e.awayTeam,
              kickoff_at: e.kickoffAt,
              updated_at: now.toISOString(),
            })),
            { onConflict: "odds_api_id" },
          )
          .select();
        if (upsertError) throw new Error(`saving matches: ${upsertError.message}`);
        const matches = rows as MatchRow[];

        // 2. Which matches are due?
        const { data: taken, error: takenError } = await db
          .from("readings")
          .select("match_id, kind")
          .in("match_id", matches.map((m) => m.id));
        if (takenError) throw new Error(`loading readings: ${takenError.message}`);

        const due = matches
          .map((m) => ({
            match: m,
            kinds: dueReadings(
              m.kickoff_at,
              (taken ?? []).filter((t) => t.match_id === m.id).map((t) => t.kind as ReadingKind),
              now,
              creditsRemaining,
            ),
          }))
          .filter((d) => d.kinds.length > 0);
        if (due.length === 0) continue;

        // 3. Bookie odds for the whole league (1 credit), then Polymarket straight after.
        const odds = await fetchLeagueOdds(league.oddsApiKey);
        creditsUsed += odds.creditsUsed;
        if (odds.creditsRemaining !== null) creditsRemaining = odds.creditsRemaining;

        for (const { match, kinds } of due) {
          const label = `${league.code} ${match.home_team} v ${match.away_team}`;
          const bookies = odds.byEventId.get(match.odds_api_id) ?? [];
          if (bookies.length === 0) {
            log.push(`${label}: no bookie odds yet, will try next run`);
            continue;
          }

          let poly = null;
          try {
            let link: PolymarketLink | null =
              match.polymarket_status === "matched" && match.polymarket_event_id && match.polymarket_markets
                ? {
                    eventId: match.polymarket_event_id,
                    title: match.polymarket_title ?? "",
                    url: match.polymarket_url,
                    markets: match.polymarket_markets,
                  }
                : null;
            if (!link) {
              link = await findPolymarketMatch({
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                kickoffAt: match.kickoff_at,
              });
              await db
                .from("matches")
                .update(
                  link
                    ? {
                        polymarket_status: "matched",
                        polymarket_event_id: link.eventId,
                        polymarket_title: link.title,
                        polymarket_url: link.url,
                        polymarket_markets: link.markets,
                      }
                    : { polymarket_status: "not_found" },
                )
                .eq("id", match.id);
              if (!link) log.push(`${label}: no Polymarket market found`);
            }
            poly = link ? await fetchPolymarketPrices(link) : null;
          } catch (e) {
            // Tatum trouble: don't save a half reading. The next run tries again.
            log.push(`${label}: Tatum error, will try next run (${errorText(e)})`);
            continue;
          }

          // 4. Save.
          for (const kind of kinds) {
            const reading = buildReading(
              {
                oddsApiId: match.odds_api_id,
                leagueCode: league.code,
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                kickoffAt: match.kickoff_at,
              },
              kind,
              odds.fetchedAt,
              bookies,
              poly,
            );
            const { error } = await db
              .from("readings")
              .upsert({ match_id: match.id, ...reading }, { onConflict: "match_id,kind", ignoreDuplicates: true });
            if (error) {
              log.push(`${label}: couldn't save ${kind} reading (${error.message})`);
              continue;
            }
            readingsSaved++;
            log.push(
              `${label}: saved ${kind} reading, ${bookies.length} bookies, Polymarket ${reading.poly_status}` +
                (reading.usable ? "" : " (not used for scoring)"),
            );
          }
        }
      } catch (e) {
        log.push(`${league.code}: skipped this run (${errorText(e)})`);
      }
    }
    if (creditsRemaining !== null && creditsRemaining < 60) {
      log.push(`Low on Odds API credits (${creditsRemaining} left): pre-kickoff readings are paused`);
    }

    // 5. Stamp new readings on Sui (and retry any that failed in the last week).
    await stampPendingReadings(db, now, log);
  } finally {
    await db
      .from("job_runs")
      .update({
        finished_at: new Date().toISOString(),
        readings_saved: readingsSaved,
        odds_credits_used: creditsUsed,
        odds_credits_remaining: creditsRemaining,
        log,
      })
      .eq("id", run.id);
  }

  return { readingsSaved, creditsUsed, creditsRemaining, log };
}
