// Saves every team in our leagues (football-data.org id, names, crest, colours) to the `teams` table,
// then checks them: each crest URL must load, and every team name The Odds API uses for an upcoming game
// must link to exactly one football-data.org team (the same matching the data job uses).
// Run: npx tsx scripts/sync-teams.mts            (check + save)
//      npx tsx scripts/sync-teams.mts --dry-run  (check only)
import { existsSync } from "node:fs";
import { LEAGUES } from "../src/lib/leagues";
import { listEvents } from "../src/lib/odds-api";
import { createAdminClient } from "../src/lib/supabase/admin";
import { findTeam, parseClubColors, type TeamRow } from "../src/lib/team-look";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const dryRun = process.argv.includes("--dry-run");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ApiTeam = { id: number; name: string; shortName: string | null; tla: string | null; crest: string | null; clubColors: string | null };

const problems: string[] = [];
const rows: TeamRow[] = [];

for (const league of LEAGUES) {
  const res = await fetch(`https://api.football-data.org/v4/competitions/${league.code}/teams`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
  });
  if (!res.ok) throw new Error(`football-data.org returned ${res.status} for ${league.code} teams`);
  const teams = ((await res.json()) as { teams: ApiTeam[] }).teams;
  const leagueRows = teams.map((t) => ({
    football_data_id: t.id, league_code: league.code, name: t.name, short_name: t.shortName,
    tla: t.tla, crest_url: t.crest, club_colors: t.clubColors,
  }));
  rows.push(...leagueRows);

  console.log(`\n${league.name} (${teams.length} teams)`);
  for (const t of leagueRows) {
    let crest = "no crest";
    if (t.crest_url) {
      const head = await fetch(t.crest_url, { method: "HEAD" }).catch(() => null);
      crest = head?.ok ? "crest ok" : `crest BROKEN (${head?.status ?? "no answer"})`;
    }
    const colors = parseClubColors(t.club_colors) ? "colours ok" : `colours unknown ("${t.club_colors ?? ""}")`;
    const flag = crest !== "crest ok" ? " <-- FIX" : "";
    if (flag) problems.push(`${league.code} ${t.name}: ${crest}`);
    console.log(`  ${String(t.football_data_id).padStart(5)} ${t.name.padEnd(34)} ${crest.padEnd(12)} ${colors}${flag}`);
  }

  // Every name The Odds API uses in this league must link to exactly one of these teams.
  const events = await listEvents(league.oddsApiKey);
  const names = [...new Set(events.flatMap((e) => [e.homeTeam, e.awayTeam]))];
  const unmatched = names.filter((n) => !findTeam(n, leagueRows));
  for (const n of unmatched) problems.push(`${league.code} odds name "${n}": no single football-data.org team`);
  console.log(`  Odds API names in upcoming games: ${names.length}, linked: ${names.length - unmatched.length}` +
    (unmatched.length ? `, NOT linked: ${unmatched.join(", ")}` : ""));
  await sleep(6500); // football-data.org free plan: 10 requests a minute
}

if (!dryRun) {
  const { error } = await createAdminClient()
    .from("teams")
    .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "football_data_id,league_code" });
  console.log(error ? `\nCouldn't save teams: ${error.message}` : `\nSaved ${rows.length} teams.`);
}
console.log(problems.length ? `\n${problems.length} problem(s):\n  ${problems.join("\n  ")}` : "\nNo problems.");
