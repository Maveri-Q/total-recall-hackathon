"use client";

import Link from "next/link";
import { useState } from "react";
import { walrusUrl } from "@/lib/walrus-links";
import { Info } from "../info";
import { useCountUp } from "./hooks";

export type RecordGame = {
  label: string;
  kickoffAt: string;
  closer: "bookies" | "polymarket" | "tie";
  blobId: string;
};

const CLOSER = {
  bookies: { text: "Bookies closer", mark: "mark-bookies" },
  polymarket: { text: "Polymarket closer", mark: "mark-poly" },
  tie: { text: "Level", mark: "" },
} as const;



function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** The 5 most recent games behind the record, each linked to its memory on Walrus. */
function RecentGames({ games, total }: { games: RecordGame[]; total: number }) {
  const recent = [...games].sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt)).slice(0, 5);
  return (
    <div className="reveal -mt-1.5 flex flex-col">
      {recent.map((g) => (
        <div key={g.blobId} className="flex items-center justify-between gap-2.5 border-t border-white/5 py-[9px]">
          <span className="flex min-w-0 flex-col gap-px">
            <span className="num text-[14px] font-medium">{g.label}</span>
            <span className="text-[12px] text-fainter">
              {shortDate(g.kickoffAt)},{" "}
              <a href={walrusUrl(g.blobId)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center">
                memory {g.blobId.slice(0, 6)}
              </a>
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-[#DCE7E0]">
            {CLOSER[g.closer].mark && <span aria-hidden="true" className={CLOSER[g.closer].mark} />}
            {CLOSER[g.closer].text}
          </span>
        </div>
      ))}
      <Link href="/memory" className="inline-flex min-h-11 items-center text-[13px] font-medium">
        See all {total} on the Memory page
      </Link>
    </div>
  );
}

function Num({ value, done, align }: { value: number; done: boolean; align: "start" | "end" }) {
  return (
    <span
      className={`num font-display text-[72px] font-extrabold leading-[0.82] tracking-[-0.05em] ${done ? "bump" : "rolling"} ${
        align === "end" ? "self-end" : "self-start"
      }`}
    >
      {value}
    </span>
  );
}

/**
 * "Who's been closer when they disagreed like this": the record counts up from 0 when the card opens.
 * With fewer than `min` games it says so plainly instead.
 */
export function RecordCount({
  id,
  bookies,
  polymarket,
  games,
  lastWeek,
  leagueName,
  recent,
  min,
}: {
  id: string;
  bookies: number;
  polymarket: number;
  games: number;
  lastWeek: { bookies: number; polymarket: number };
  leagueName: string;
  recent: RecordGame[];
  min: number;
}) {
  const [open, setOpen] = useState(false);
  const enough = games >= min;
  const b = useCountUp(bookies, { run: enough });
  const p = useCountUp(polymarket, { run: enough });
  const n = useCountUp(games, { run: enough });
  const done = b.done && p.done && n.done;
  const since = (now: number, then: number) => (now - then > 0 ? `+${now - then} since last week` : "No change since last week");

  const seeThem = recent.length > 0 && (
    <>
      <div className="flex items-center justify-between gap-2.5 border-t border-white/[0.06] pt-2.5">
        <span className="text-[13px] text-muted">
          {enough ? `Built from ${games} games remembered on Walrus` : `${recent.length} ${recent.length === 1 ? "game" : "games"} like this so far, remembered on Walrus`}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="press min-h-11 shrink-0 cursor-pointer rounded-full border border-white/[0.14] px-3 text-[13px] font-medium"
        >
          {open ? "Hide" : "See them"}
        </button>
      </div>
      {open && <RecentGames games={recent} total={recent.length} />}
    </>
  );

  return (
    <div className="deep flex flex-col gap-3.5 rounded-[20px] px-4 pb-3.5 pt-4">
      <span className="text-[13px] text-faint">
        Who&apos;s been closer when they disagreed like this
        <Info id={`score-${id}`} label="About this score">
          After every game, we check who got closer to the real result. This is the score so far in games like this one.
        </Info>
      </span>

      {enough ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
            <span className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-bookies">
                <span aria-hidden="true" className="mark-bookies" />
                Bookies
              </span>
              <Num value={b.value} done={done} align="start" />
            </span>
            <span className="pb-1 text-center text-[12px] leading-[1.3] text-faint">
              out of <span className="num">{n.value}</span>
              <br />
              {leagueName} games
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-poly">
                Polymarket
                <span aria-hidden="true" className="mark-poly" />
              </span>
              <Num value={p.value} done={done} align="end" />
            </span>
          </div>
          {done && (
            <div className="pop flex justify-between text-[12px] text-muted">
              <span>{since(bookies, lastWeek.bookies)}</span>
              <span>{since(polymarket, lastWeek.polymarket)}</span>
            </div>
          )}
        </>
      ) : (
        <p className="m-0 text-[14px] leading-normal text-faint">
          Not enough games like this yet. We&apos;ll show who&apos;s been closer once we have {min}.
        </p>
      )}
      {seeThem}
    </div>
  );
}
