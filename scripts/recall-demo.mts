// Shows what Walrus Memory recalls for upcoming matches: similar past cases and the league's source record.
// This is the recall the "Who to trust" view will show. Run: npx tsx scripts/recall-demo.mts [matches]
import { existsSync } from "node:fs";
import { leagueByCode } from "../src/lib/leagues";
import { createAdminClient } from "../src/lib/supabase/admin";
import { NAMESPACES, readingGap, similarCasesQuery, sourceRecordQuery, type ReadingRow } from "../src/lib/data-job/memories";
import { recallMemories } from "../src/lib/walrus";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const db = createAdminClient();
const howMany = Number(process.argv[2] ?? 3);

const { data: upcoming } = await db
  .from("matches")
  .select("league_code, home_team, away_team, kickoff_at, readings(*)")
  .gt("kickoff_at", new Date().toISOString())
  .order("kickoff_at")
  .limit(howMany);

for (const m of upcoming ?? []) {
  const info = { leagueName: leagueByCode(m.league_code)?.name ?? m.league_code, homeTeam: m.home_team, awayTeam: m.away_team, kickoffAt: m.kickoff_at };
  const latest = (m.readings as ReadingRow[]).sort((a, b) => b.odds_fetched_at.localeCompare(a.odds_fetched_at))[0];
  const query = similarCasesQuery(info, latest ? readingGap(latest) : null);
  console.log(`\n=== ${info.leagueName}: ${m.home_team} v ${m.away_team}, ${m.kickoff_at}`);
  console.log(`asked Walrus: ${query}`);
  for (const r of await recallMemories(query, NAMESPACES.match_result, 3)) {
    console.log(`  past case (distance ${r.distance.toFixed(3)}, blob ${r.blobId}):\n    ${r.text}`);
  }
  for (const r of await recallMemories(sourceRecordQuery(info.leagueName), NAMESPACES.source_record, 2)) {
    console.log(`  record (distance ${r.distance.toFixed(3)}, blob ${r.blobId}):\n    ${r.text}`);
  }
}
