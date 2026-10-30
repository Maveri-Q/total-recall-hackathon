"use client";

import { useState } from "react";
import type { ProofMemory } from "@/lib/proof-page";
import { walrusUrl } from "@/lib/walrus-links";
import { When } from "../ui/when";

const KINDS = {
  reading: { icon: "%", title: "Odds saved", style: "bg-[#EEF1EF] text-ink" },
  match_result: { icon: "FT", title: "Result checked", style: "bg-[#E3F6EC] text-poly-text text-[12px]" },
  source_record: { icon: "+1", title: "Record updated", style: "bg-[rgba(79,224,181,0.2)] text-hero-number text-[13px]" },
  call: { icon: "You", title: "Your call saved", style: "bg-ink text-lime text-[11px]" },
} as const;

/** "Remembered on Walrus": the app's memories, or only the user's own calls. Never other people's calls. */
const PAGE = 12;

export function MemoryList({ game, mine }: { game: ProofMemory[]; mine: ProofMemory[] | null }) {
  const [tab, setTab] = useState<"game" | "mine">("game");
  const [shown, setShown] = useState(PAGE);
  const all = tab === "game" ? game : (mine ?? []);
  const rows = all.slice(0, shown);
  return (
    <>
      <div role="tablist" aria-label="Memories" className="glass grid grid-cols-2 gap-1 rounded-2xl p-1">
        {(
          [
            ["game", "Game memories"],
            ["mine", "My memories"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setShown(PAGE);
            }}
            className={`press min-h-11 cursor-pointer rounded-xl border-none text-[13px] ${tab === key ? "bg-ink font-bold text-white" : "bg-transparent font-semibold text-ink-2"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "mine" && mine === null && <p className="m-0 text-[14px] text-muted">Sign in to see your own calls here.</p>}
      {tab === "mine" && mine?.length === 0 && <p className="m-0 text-[14px] text-muted">None yet. Make a call on Matches and it shows here once it&apos;s saved on Walrus.</p>}
      {rows.map((m, i) => {
        const k = KINDS[m.kind];
        return (
          <div key={m.id} className={`glass grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] px-3.5 py-3 ${i === 0 ? "fresh" : ""}`}>
            <span aria-hidden="true" className={`inline-flex h-9 w-9 items-center justify-center rounded-xl font-display text-[15px] font-black ${k.style}`}>
              {k.icon}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14px] font-bold">{k.title}</span>
              {m.summary && <span className="text-[13px] text-muted">{m.summary}</span>}
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="whitespace-nowrap text-[12px] text-faint">
                <When iso={m.savedAt} format="ago" />
              </span>
              <a href={walrusUrl(m.blobId)} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center text-[12px] font-bold">
                Check
              </a>
            </span>
          </div>
        );
      })}
      {all.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="press min-h-11 cursor-pointer rounded-[14px] border border-[rgba(11,26,20,0.12)] bg-transparent text-[14px] font-bold text-ink"
        >
          Show {Math.min(PAGE, all.length - shown)} more of {all.length}
        </button>
      )}
    </>
  );
}
