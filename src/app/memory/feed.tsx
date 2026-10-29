"use client";

import Link from "next/link";
import { useState } from "react";
import type { FeedItem } from "@/lib/memory-page";
import { useNow } from "../coming-up/hooks";
import { walrusUrl } from "@/lib/walrus-links";

const KINDS = {
  source_record: { icon: "R", title: "Record updated", style: "bg-[rgba(198,243,107,0.14)] text-lime" },
  match_result: { icon: "FT", title: "Result graded", style: "bg-[rgba(143,211,255,0.14)] text-poly" },
  reading: { icon: "%", title: "Reading saved", style: "bg-[rgba(245,165,36,0.14)] text-bookies" },
  call: { icon: "You", title: "Your call saved", style: "bg-[rgba(242,245,241,0.12)] text-chalk text-[11px]" },
} as const;

const FILTERS = ["All", "App memory", "Your memory"] as const;

function ago(iso: string, now: number | null): string {
  if (now === null) return "";
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return hours < 48 ? "Yesterday" : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** The latest Walrus writes, newest first. The newest one pulses once when the page opens. */
export function MemoryFeed({ feed, signedIn }: { feed: FeedItem[]; signedIn: boolean }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const now = useNow();
  const shown = feed.filter(
    (m) => filter === "All" || (filter === "App memory" && m.kind !== "call") || (filter === "Your memory" && m.mine),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="group" aria-label="Show memories">
        {FILTERS.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={filter === name}
            onClick={() => setFilter(name)}
            className={`press min-h-11 cursor-pointer rounded-full px-3.5 text-[13px] font-medium ${
              filter === name ? "border border-transparent bg-chalk text-ground" : "border border-white/10 bg-white/[0.04] text-muted"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="m-0 text-[14px] text-faint">
          {filter === "Your memory" && !signedIn ? (
            <>
              <Link href="/login">Sign in</Link> to see your own calls here.
            </>
          ) : filter === "Your memory" ? (
            "None yet. Make a call on Coming up and it shows here once it's saved on Walrus."
          ) : (
            "No memories yet."
          )}
        </p>
      )}

      {shown.map((m, i) => {
        const k = KINDS[m.kind];
        const title = m.kind === "call" && !m.mine ? "A fan's call saved" : k.title;
        return (
          <div
            key={m.id}
            className={`glass flex items-start gap-3 rounded-[18px] px-3.5 py-3 ${i === 0 && filter === "All" ? "fresh" : ""}`}
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl font-display text-[13px] font-bold ${k.style}`}
            >
              {m.kind === "call" && !m.mine ? "Fan" : k.icon}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="flex justify-between gap-2">
                <span className="text-[14px] font-semibold">{title}</span>
                <span className="whitespace-nowrap text-[12px] text-fainter">{ago(m.savedAt, now)}</span>
              </div>
              {m.summary && <span className="text-[14px] leading-[1.45] text-muted">{m.summary}</span>}
              <a href={walrusUrl(m.blobId)} target="_blank" rel="noreferrer" className="num inline-flex min-h-11 items-center text-[12px]">
                Remembered on Walrus, memory {m.blobId.slice(0, 6)}
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
