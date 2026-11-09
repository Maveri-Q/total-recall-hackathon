import type { RecentResult } from "@/lib/recent-results";
import { resultsTally } from "@/lib/recent-results";
import { When } from "../ui/when";

const CLOSER = { bookies: "Bookies closer", polymarket: "Polymarket closer", tie: "Too close to call" } as const;
const CLOSER_COLOUR = { bookies: "text-bookies", polymarket: "text-poly-text", tie: "text-faint" } as const;

/** "Last week's results": every graded game from the latest round, what happened and who got closer. */
export function RecentResults({ games }: { games: RecentResult[] }) {
  if (games.length === 0) return null;
  const t = resultsTally(games);
  return (
    <section className="flex flex-col gap-2.5 pt-3" aria-label="Last week's results">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[26px] font-extrabold tracking-[-0.035em]">Last week&apos;s results</h2>
        <p className="m-0 text-[15px] font-semibold text-ink-2">
          Bookies {t.bookies} · Polymarket {t.polymarket} · {t.tooClose} too close to call
        </p>
        <p className="m-0 text-[13px] text-muted">The chance each one gave the result that happened.</p>
      </div>
      <ul className="glass m-0 flex list-none flex-col rounded-[24px] p-0">
        {games.map((g) => {
          const what = g.result === "draw" ? "Draw" : `${g.result === "home" ? g.homeTeam : g.awayTeam} win`;
          return (
            <li key={g.id} className="flex flex-col gap-1 border-t border-[rgba(11,26,20,0.06)] px-4 py-3 first:border-t-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[15px] font-bold text-ink">
                  {g.homeTeam} <span className="num">{g.homeGoals}–{g.awayGoals}</span> {g.awayTeam}
                </span>
                <span className="shrink-0 text-[12px] font-semibold text-faint">
                  <When iso={g.kickoffAt} format="day" />
                </span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
                <span className="text-ink-2">
                  {what}: bookies <span className="num font-semibold">{g.bookies}%</span>, Polymarket <span className="num font-semibold">{g.poly}%</span>
                </span>
                <span className={`font-bold ${CLOSER_COLOUR[g.closer]}`}>{CLOSER[g.closer]}</span>
              </div>
              <span className="text-[12px] text-faint">{g.leagueName}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
