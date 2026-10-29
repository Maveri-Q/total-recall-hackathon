import type { Outcome, ThreeWay } from "@/lib/odds";

const pct = (x: number) => Math.round(x * 100);

const SHADES = {
  bookies: { bg: ["#1E2B25", "#6F7C75", "#D5DBD8"], text: ["#FFFFFF", "#FFFFFF", "#1E2B25"] },
  poly: { bg: ["#0FA968", "#7FD8B0", "#D3F2E4"], text: ["#FFFFFF", "#06331F", "#06331F"] },
} as const;

function Row({ source, chances }: { source: "bookies" | "poly"; chances: ThreeWay }) {
  const s = SHADES[source];
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2">
      <span className={`inline-flex items-center gap-[7px] text-[13px] font-bold ${source === "bookies" ? "text-bookies" : "text-poly-text"}`}>
        <span aria-hidden="true" className={source === "bookies" ? "mark-bookies" : "mark-poly"} />
        {source === "bookies" ? "Bookies" : "Polymarket"}
      </span>
      <div className="bar-grow flex h-[30px] gap-[2px] overflow-hidden rounded-[9px]" role="img" aria-label={`${source === "bookies" ? "Bookies" : "Polymarket"}: home ${pct(chances.home)}%, draw ${pct(chances.draw)}%, away ${pct(chances.away)}%`}>
        {(["home", "draw", "away"] as const).map((o, i) => (
          <span
            key={o}
            className="num inline-flex min-w-[30px] items-center justify-center font-display text-[13px] font-extrabold"
            style={{ width: `${pct(chances[o])}%`, background: s.bg[i], color: s.text[i] }}
          >
            {pct(chances[o])}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** Bookies and Polymarket as two stacked bars, always both visible, then one verdict pill. */
export function OddsBars({
  bookies,
  poly,
  home,
  away,
  gap,
}: {
  bookies: ThreeWay;
  poly: ThreeWay | null;
  home: string;
  away: string;
  gap: { outcome: Outcome; points: number; polyHigher: boolean } | null;
}) {
  const n = gap ? Math.round(gap.points) : 0;
  const what = !gap ? "" : gap.outcome === "home" ? home : gap.outcome === "away" ? away : "a draw";
  const verdict = !poly
    ? "No Polymarket market for this game yet"
    : n >= 5
      ? `${gap!.polyHigher ? "Polymarket rates" : "Bookies rate"} ${what} ${n} points higher`
      : "They agree on this one";
  return (
    <div className="flex flex-col gap-2">
      <Row source="bookies" chances={bookies} />
      {poly && <Row source="poly" chances={poly} />}
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 text-[11px] font-semibold text-faint">
        <span />
        <span className="flex justify-between gap-2">
          <span className="truncate">{home}</span>
          <span>Draw</span>
          <span className="truncate">{away}</span>
        </span>
      </div>
      <span
        className={`self-start rounded-full px-[11px] py-1.5 text-[13px] font-bold ${
          poly && n >= 5 ? "bg-[rgba(15,169,104,0.12)] text-poly-text" : "bg-[rgba(11,26,20,0.05)] text-muted"
        }`}
      >
        {verdict}
      </span>
    </div>
  );
}
