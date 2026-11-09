// Re-grades every graded reading with the current rule in grading.ts (lower Brier score is closer; only a
// same-score tie gives no point), so older games follow it too. Same readings and results in, same answer out.
// Dry run (shows what would change): npx tsx scripts/regrade-too-close.mts
// Save the changes:                  npx tsx scripts/regrade-too-close.mts --save
import { existsSync } from "node:fs";
import type { Outcome } from "../src/lib/odds";
import { gradeReading } from "../src/lib/data-job/grading";
import { createAdminClient } from "../src/lib/supabase/admin";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const save = process.argv.includes("--save");
const db = createAdminClient();

const { data, error } = await db
  .from("readings")
  .select("id, kind, closer, bookie_home, bookie_draw, bookie_away, poly_home, poly_draw, poly_away, usable, matches!inner(home_team, away_team, result)")
  .not("graded_at", "is", null)
  .not("matches.result", "is", null);
if (error) throw new Error(error.message);

type Row = (typeof data)[number] & { matches: { home_team: string; away_team: string; result: Outcome } };
let changed = 0;
for (const r of data as Row[]) {
  const { closer } = gradeReading(r, r.matches.result);
  if (closer === r.closer) continue;
  changed++;
  console.log(`${r.matches.home_team} v ${r.matches.away_team} (${r.kind}): ${r.closer} -> ${closer}`);
  if (save) {
    const { error: e } = await db.from("readings").update({ closer }).eq("id", r.id);
    if (e) throw new Error(e.message);
  }
}
console.log(`${data.length} graded readings, ${changed} ${save ? "changed" : "would change"}.`);
