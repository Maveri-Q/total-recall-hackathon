// Dry run of the Polymarket matching for every match in the next few days. Saves nothing and
// costs no Odds API credits (/events is free). Run with: npx tsx scripts/check-matching.ts [days]
import { existsSync } from "node:fs";
import { LEAGUES } from "../src/lib/leagues";
import { listEvents } from "../src/lib/odds-api";
import { fetchPolymarketPrices, findPolymarketMatch } from "../src/lib/tatum";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const days = Number(process.argv[2] ?? 4);
const until = Date.now() + days * 24 * 60 * 60 * 1000;
let found = 0;
let missing = 0;

for (const league of LEAGUES) {
  const events = (await listEvents(league.oddsApiKey)).filter((e) => {
    const t = new Date(e.kickoffAt).getTime();
    return t > Date.now() && t <= until;
  });
  for (const e of events) {
    const link = await findPolymarketMatch(e);
    const prices = link ? await fetchPolymarketPrices(link) : null;
    if (link && prices) {
      found++;
      const p = prices.yes;
      console.log(
        `OK   ${league.code} ${e.homeTeam} v ${e.awayTeam} -> "${link.title}" ` +
          `Yes ${p.home}/${p.draw}/${p.away}, $${Math.round(prices.volume)}`,
      );
    } else {
      missing++;
      console.log(`MISS ${league.code} ${e.homeTeam} v ${e.awayTeam} (${e.kickoffAt})`);
    }
  }
}
console.log(`\nMatched ${found}, not found ${missing}.`);
