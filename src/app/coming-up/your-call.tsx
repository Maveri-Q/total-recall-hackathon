"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { callLabel, CALLS, type Call } from "@/lib/call-result";
import { explorerTxUrl } from "@/lib/sui-stamp";
import { makeCallAction, retryStampAction } from "../calls/actions";
import { useMounted } from "./hooks";

export type CurrentCall = {
  version: number;
  pick: Call;
  suiStatus: "pending" | "stamped" | "failed" | "not_applicable";
  suiDigest: string | null;
  stampedAt: string | null;
};

// [left %, dx px, dy px, size px]: dust bursts from the card's bottom edge, mostly the corners (design-reference/Main).
const DUST = [
  [3, -26, -6, 6], [8, -18, -11, 5], [14, -10, -4, 4], [22, -6, -9, 5], [86, 6, -9, 5], [92, 12, -4, 4],
  [96, 20, -11, 5], [99, 28, -6, 6], [40, -8, -6, 4], [60, 8, -6, 4], [30, -14, -8, 4], [70, 14, -8, 4],
] as const;

function clock(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}${d.getHours() < 12 ? "am" : "pm"}`;
}

/** "Locked: Roma win", landing under the buttons once the call is stamped on Sui. */
function StampCard({ label, digest, stampedAt }: { label: string; digest: string; stampedAt: string | null }) {
  const mounted = useMounted();
  return (
    <div className="relative pb-0.5">
      <div className="land flex min-h-14 items-center gap-3 rounded-2xl bg-chalk px-3 py-2.5 text-ground shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
        <span aria-hidden="true" className="lime-mint inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M3 7.5 L6 10 L11 4" stroke="#0A1712" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="font-display text-[15px] font-bold tracking-[-0.01em]">Locked: {label}</span>
          <span className="text-[12px] text-ink-soft">
            {stampedAt && mounted ? `Stamped on Sui at ${clock(stampedAt)}.` : "Stamped on Sui."}
          </span>
        </span>
        <a
          href={explorerTxUrl(digest)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-ground px-2.5 text-[12px] font-semibold text-chalk no-underline hover:text-chalk"
        >
          View on Sui
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M3 7 L7 3 M4 3 H7 V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>
      {DUST.map(([left, dx, dy, size], i) => (
        <span
          key={i}
          aria-hidden="true"
          className="dust pointer-events-none absolute bottom-0 z-10 rounded-full bg-[rgba(226,234,229,0.75)] blur-[0.8px]"
          style={
            { left: `${left}%`, width: size, height: size, marginLeft: -size / 2, "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** "Your call" with three buttons named after the teams. The current call shows in lime. */
export function YourCall({
  matchId,
  home,
  away,
  current,
  signedIn,
}: {
  matchId: string;
  home: string;
  away: string;
  current: CurrentCall | null;
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Light up the tapped button straight away. If saving fails, it falls back to the saved call.
  const [shown, setShown] = useOptimistic(current?.pick ?? null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const stamping = current?.suiStatus === "pending";

  // The stamp lands a few seconds after the tap. Check back until it shows (or give up after a minute).
  useEffect(() => {
    if (!stamping) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (++tries > 12) clearInterval(timer);
      else router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [stamping, router]);

  const choose = (pick: Call) =>
    startTransition(async () => {
      setError(null);
      setShown(pick);
      const state = await makeCallAction(matchId, pick);
      if (state.error) setError(state.error);
    });
  const retry = () =>
    startTransition(async () => {
      setError(null);
      const state = await retryStampAction(matchId);
      if (state.error) setError(state.error);
    });

  const button = "min-h-[46px] rounded-full px-1.5 text-[14px] leading-tight";
  const idle = `${button} border border-white/[0.12] bg-white/[0.04] font-medium text-chalk`;
  const chosen = `${button} lime-mint border border-transparent font-semibold`;
  const landed = current?.suiStatus === "stamped" && current.suiDigest && shown === current.pick;

  return (
    <div className="flex flex-col gap-3">
      <div key={landed ? `thud-${current.version}` : "row"} className={`flex flex-col gap-2 ${landed ? "thud" : ""}`}>
        <span className="text-[13px] font-semibold text-faint">Your call</span>
        {!signedIn && (
          <Link href="/login" className="text-[13px]">
            Sign in to make your call
          </Link>
        )}
        <div className="grid grid-cols-3 gap-2">
          {CALLS.map((pick) => {
            const label = callLabel(pick, home, away);
            if (!signedIn) {
              return (
                <Link key={pick} href="/login" className={`${idle} press inline-flex items-center justify-center text-center no-underline hover:text-chalk`}>
                  {label}
                </Link>
              );
            }
            const isChosen = shown === pick;
            const busy = isChosen && (pending || stamping);
            return (
              <button
                key={pick}
                type="button"
                disabled={pending}
                aria-pressed={isChosen}
                onClick={() => choose(pick)}
                className={`press cursor-pointer ${isChosen ? chosen : idle}`}
              >
                {busy ? "Stamping…" : label}
              </button>
            );
          })}
        </div>
      </div>

      {landed && <StampCard key={current.version} label={callLabel(current.pick, home, away)} digest={current.suiDigest!} stampedAt={current.stampedAt} />}

      {current?.suiStatus === "failed" && shown === current.pick && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-error/40 px-3 py-2">
          <span className="text-[13px] text-error">Couldn&apos;t stamp your call on Sui.</span>
          <button type="button" onClick={retry} disabled={pending} className="press min-h-11 cursor-pointer rounded-full border border-white/15 px-3 text-[13px] font-medium">
            Try again
          </button>
        </div>
      )}
      {error && <p className="m-0 text-[13px] text-error">{error}</p>}
    </div>
  );
}
