// Builds the ticker from the database: this week's games (as on the match cards) and the last two days' results.
import "server-only";
import { bookiesOf, getRecentResults, getUpcomingMatches, polyOf, type UpcomingMatch } from "./coming-up";
import { readingGap } from "./data-job/memories";
import { tickerLines, type TickerGame, type TickerLine } from "./ticker";

/** The same chances and gap the match card shows for this game. */
export function tickerGame(m: UpcomingMatch): TickerGame {
  const r = m.reading;
  const bookies = r ? bookiesOf(r) : null;
  const poly = r && r.poly_status !== "not_found" ? polyOf(r) : null;
  return { id: m.id, kickoffAt: m.kickoffAt, home: m.home.short, away: m.away.short, bookies, poly, gap: r && bookies && poly ? readingGap(r) : null };
}

/** Pass the upcoming games when you already have them (the Matches page does), to skip loading them twice. */
export async function getTicker(now: Date, upcoming?: UpcomingMatch[]): Promise<TickerLine[]> {
  const [games, results] = await Promise.all([
    upcoming ?? getUpcomingMatches(now),
    getRecentResults(now).catch((e) => {
      console.error("ticker results", e instanceof Error ? e.message : e);
      return [];
    }),
  ]);
  return tickerLines(games.map(tickerGame), results, now);
}
