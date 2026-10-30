"use client";

import { useState } from "react";
import type { StampCheck } from "@/lib/check-stamp";
import type { ProofMemory, ProofStamp } from "@/lib/proof-page";
import { explorerTxUrl } from "@/lib/sui-stamp";
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
            ["game", "Games", game.length],
            ["mine", "My calls", mine?.length ?? null],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setShown(PAGE);
            }}
            className={`press inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-none text-[13px] ${tab === key ? "bg-ink font-bold text-white" : "bg-transparent font-semibold text-ink-2"}`}
          >
            {label}
            {count !== null && <span className={`num rounded-full px-[7px] py-px text-[12px] font-bold ${tab === key ? "bg-white/15" : "bg-[rgba(11,26,20,0.06)]"}`}>{count}</span>}
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

/** "23 hours", "3 days", "40 min": how far apart the stamp and kickoff were. */
function gap(hours: number): string {
  const h = Math.abs(hours);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} ${Math.round(h) === 1 ? "hour" : "hours"}`;
  return `${Math.round(h / 24)} days`;
}

/** What "Check" found, in plain words. Honest when a stamp came after kickoff or doesn't match. */
function CheckResult({ result }: { result: StampCheck }) {
  if (!result.ok) return <p className="m-0 text-[13px] text-muted">{result.error}</p>;
  const good = result.matches && result.byApp;
  const before = result.hoursBeforeKickoff > 0;
  return (
    <div className={`reveal flex flex-col gap-1 rounded-[14px] px-3 py-2.5 ${good ? "bg-[rgba(15,169,104,0.1)]" : "bg-[rgba(192,54,44,0.08)]"}`}>
      <span className={`inline-flex items-center gap-1.5 text-[14px] font-bold ${good ? "text-poly-text" : "text-loss"}`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          {good ? (
            <path d="M3 7.5 L6 10 L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
        {!result.matches ? "Doesn't match what we saved" : !result.byApp ? "Not stamped by our app" : "Matches what we saved"}
      </span>
      {good && (
        <span className="text-[13px] leading-snug text-ink-2">
          On Sui since <When iso={result.stampedAt} format="dayTime" />
          {before
            ? `, ${gap(result.hoursBeforeKickoff)} before kickoff. It can't have been changed after the result.`
            : `, ${gap(result.hoursBeforeKickoff)} after kickoff. It was stamped late, so it doesn't prove when it was made.`}
        </span>
      )}
      {!result.matches && <span className="text-[13px] leading-snug text-ink-2">Our saved copy changed after it was stamped. Don&apos;t trust this one.</span>}
      <span className="break-all font-mono text-[11px] text-faint">
        Read from Sui Mainnet through Tatum just now. Fingerprint {result.onchainHash.slice(0, 10)}...{result.onchainHash.slice(-6)}
      </span>
    </div>
  );
}

/**
 * One row of "Stamped on Sui". "Check" reads the stamp back from Sui through Tatum and rebuilds the
 * fingerprint from our saved record (see check-stamp.ts), so anyone can test our "can't change it" claim.
 */
export function StampRow({ stamp: s }: { stamp: ProofStamp }) {
  const [state, setState] = useState<"idle" | "checking" | StampCheck>("idle");
  const check = async () => {
    setState("checking");
    try {
      const res = await fetch(`/api/check-stamp?digest=${encodeURIComponent(s.digest)}&ref=${encodeURIComponent(s.refId)}`, { cache: "no-store" });
      setState((await res.json()) as StampCheck);
    } catch {
      setState({ ok: false, error: "Couldn't reach Sui right now. Try again in a minute." });
    }
  };
  return (
    <div className="glass flex flex-col gap-2.5 rounded-[18px] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2.5">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-display text-[16px] font-bold tracking-[-0.02em]">{s.title}</span>
          <span className="text-[12px] text-faint">
            {s.mine ? "Saved by you" : "Saved by the app"} · <When iso={s.at} format="dayTime" />
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={check}
            disabled={state === "checking"}
            className="press inline-flex min-h-11 cursor-pointer items-center rounded-full border border-ink bg-lime px-3.5 text-[12px] font-bold text-ink"
          >
            {state === "checking" ? "Checking..." : "Check"}
          </button>
          <a
            href={explorerTxUrl(s.digest)}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex min-h-11 items-center rounded-full bg-ink px-3.5 text-[12px] font-bold text-white no-underline hover:text-white"
          >
            Suiscan
          </a>
        </span>
      </div>
      {state === "checking" && <p className="m-0 text-[13px] text-muted">Reading it from Sui through Tatum...</p>}
      {typeof state === "object" && <CheckResult result={state} />}
    </div>
  );
}
