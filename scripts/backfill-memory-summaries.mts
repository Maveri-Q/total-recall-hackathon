// One-off: writes the short feed line (`summary`) for memories saved before migration 0010.
// New memories get theirs when they're queued. Safe to run again: it only fills empty ones.
// Run (after migration 0010): npx tsx scripts/backfill-memory-summaries.mts
import { existsSync } from "node:fs";
import { leagueByCode } from "../src/lib/leagues";
import { matchResultSummary, readingSummary, sourceRecord, sourceRecordSummary, matchVerdict } from "../src/lib/data-job/memories";
import type { ReadingRow, Verdict } from "../src/lib/data-job/memories";
import { createAdminClient } from "../src/lib/supabase/admin";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const db = createAdminClient();

const { data: rows, error } = await db.from("memories").select("id, kind, ref_key").is("summary", null);
if (error) throw new Error(error.message);
console.log(`${rows.length} memories without a summary`);

const info = (m: { league_code: string; home_team: string; away_team: string; kickoff_at: string }) => ({
  leagueName: leagueByCode(m.league_code)?.name ?? m.league_code,
  homeTeam: m.home_team,
  awayTeam: m.away_team,
  kickoffAt: m.kickoff_at,
});

let done = 0;
for (const row of rows) {
  let summary: string | null = null;
  if (row.kind === "reading") {
    const { data } = await db.from("readings").select("*, matches(league_code, home_team, away_team, kickoff_at)").eq("id", row.ref_key).single();
    if (data) summary = readingSummary(info(data.matches as never), data as ReadingRow);
  } else if (row.kind === "match_result") {
    const { data } = await db.from("matches").select("league_code, home_team, away_team, kickoff_at, home_goals, away_goals, readings(*)").eq("id", row.ref_key).single();
    if (data) summary = matchResultSummary(info(data), { homeGoals: data.home_goals, awayGoals: data.away_goals }, data.readings as ReadingRow[]);
  } else if (row.kind === "source_record") {
    // ref_key is "<league>:<games counted>": rebuild that record from the first N graded games of the league.
    const [code, n] = row.ref_key.split(":");
    let q = db.from("matches").select("league_code, kickoff_at, readings(*)").eq("result_status", "finished").not("graded_at", "is", null).order("kickoff_at");
    if (code !== "ALL") q = q.eq("league_code", code);
    const { data } = await q;
    const verdicts = (data ?? []).map((m) => matchVerdict(m.readings as ReadingRow[])).filter((v): v is Verdict => v !== null).slice(0, Number(n));
    summary = sourceRecordSummary(code === "ALL" ? "All leagues" : (leagueByCode(code)?.name ?? code), sourceRecord(verdicts));
  }
  if (summary) {
    await db.from("memories").update({ summary }).eq("id", row.id);
    done++;
  }
}
console.log(`Filled ${done} summaries.`);
