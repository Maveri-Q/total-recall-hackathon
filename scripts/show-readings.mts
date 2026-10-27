// Prints the latest saved readings and job runs, to check the data job. Run: npx tsx scripts/show-readings.mts
import { existsSync } from "node:fs";
import { createAdminClient } from "../src/lib/supabase/admin";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const db = createAdminClient();
const pct = (n: number | null) => (n === null ? "  -  " : `${(Number(n) * 100).toFixed(1)}%`);

const { data: readings, error } = await db
  .from("readings")
  .select("kind, taken_at, odds_fetched_at, poly_fetched_at, bookie_count, bookie_home, bookie_draw, bookie_away, poly_status, poly_volume, poly_home, poly_draw, poly_away, in_sync, usable, content_hash, sui_status, matches(league_code, home_team, away_team, kickoff_at, polymarket_title)")
  .order("taken_at", { ascending: false })
  .limit(Number(process.argv[2] ?? 10));
if (error) throw error;

for (const r of readings ?? []) {
  const m = r.matches as unknown as { league_code: string; home_team: string; away_team: string; kickoff_at: string; polymarket_title: string };
  const gapSec = r.poly_fetched_at ? Math.round((+new Date(r.poly_fetched_at) - +new Date(r.odds_fetched_at)) / 1000) : null;
  console.log(`${m.league_code} ${m.home_team} v ${m.away_team} | kickoff ${m.kickoff_at} | ${r.kind}`);
  console.log(`   Bookies (${r.bookie_count}): ${pct(r.bookie_home)} / ${pct(r.bookie_draw)} / ${pct(r.bookie_away)}`);
  console.log(`   Polymarket: ${pct(r.poly_home)} / ${pct(r.poly_draw)} / ${pct(r.poly_away)}  $${Math.round(r.poly_volume ?? 0)} ${r.poly_status}  "${m.polymarket_title}"`);
  console.log(`   fetch gap ${gapSec}s, in sync ${r.in_sync}, usable ${r.usable}, sui ${r.sui_status}, hash ${r.content_hash.slice(0, 12)}…`);
}

const { data: runs } = await db.from("job_runs").select("started_at, finished_at, readings_saved, odds_credits_used, odds_credits_remaining, error").order("started_at", { ascending: false }).limit(5);
console.log("\nLast job runs:");
for (const run of runs ?? []) console.log(`   ${run.started_at} saved ${run.readings_saved}, credits used ${run.odds_credits_used}, left ${run.odds_credits_remaining}${run.error ? `, error ${run.error}` : ""}`);
