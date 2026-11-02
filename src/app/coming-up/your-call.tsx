"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { callLabel, CALLS, type Call } from "@/lib/call-result";
import { explorerTxUrl } from "@/lib/sui-stamp";
import { makeCallAction, retryStampAction, type CallState } from "../calls/actions";
import { signInWithGoogle } from "../login/actions";
import { When } from "../ui/when";

export type CurrentCall = {
  version: number;
  pick: Call;
  suiStatus: "pending" | "stamped" | "failed" | "not_applicable";
  suiDigest: string | null;
  stampedAt: string | null;
  /** "saved" once the call is remembered on Walrus, "saving" while it's on its way. */
  walrus: "saved" | "saving" | null;
};

/** "waiting": saved, but the app wallet can't pay for the stamp yet; it's stamped automatically after a top-up. */
type Stamp = { state: "stamping" } | { state: "stamped"; digest: string; stampedAt: string } | { state: "waiting" } | { state: "failed" };

// [left %, dx px, dy px, size px]: dust bursts from the card's bottom corners (design-reference/Main).
const DUST = [
  [3, -26, -6, 6], [8, -18, -11, 5], [14, -10, -4, 4], [22, -6, -9, 5], [86, 6, -9, 5], [92, 12, -4, 4],
  [96, 20, -11, 5], [99, 28, -6, 6], [40, -8, -6, 4], [60, 8, -6, 4], [30, -14, -8, 4], [70, 14, -8, 4],
] as const;

/** The ink card that lands under the buttons: "Stamping on Sui..." first, then the proof. */
function StampCard({ label, stamp, walrus, onRetry, busy }: { label: string; stamp: Stamp; walrus: CurrentCall["walrus"]; onRetry: () => void; busy: boolean }) {
  return (
    <div className="relative">
      <div className="land on-dark flex min-h-14 items-center gap-3 rounded-[18px] bg-ink px-3 py-2.5 text-white shadow-[0_12px_24px_rgba(11,26,20,0.22)]">
        <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime">
          {stamp.state === "stamping" ? (
            <svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a6 6 0 1 1-6 6" stroke="#0B1A14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : stamp.state === "stamped" ? (
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M3 7.5 L6 10 L11 4" stroke="#0B1A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : stamp.state === "waiting" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5.6" stroke="#0B1A14" strokeWidth="1.7" />
              <path d="M8 5v3.2l2 1.3" stroke="#0B1A14" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 4l6 6M10 4l-6 6" stroke="#0B1A14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px" aria-live="polite">
          <span className="font-display text-[15px] font-bold">Locked: {label}</span>
          <span className="text-[12px] text-[#C9D6CE]">
            {stamp.state === "stamping" && "Stamping on Sui..."}
            {stamp.state === "failed" && "Couldn't stamp. Try again."}
            {stamp.state === "waiting" && "Saved. Waiting to be stamped on Sui."}
            {stamp.state === "stamped" && (
              <>
                Stamped on Sui at <When iso={stamp.stampedAt} format="timeZone" />.
                {walrus === "saved" ? " Saved on Walrus." : " Saving to Walrus, about 20 seconds..."}
              </>
            )}
          </span>
          {stamp.state === "stamped" && (
            // Walrus takes 20 to 23 seconds to store a memory (measured). The bar fills over that time, then completes when it's saved.
            <span aria-hidden="true" className="mt-1 block h-[3px] overflow-hidden rounded-full bg-white/15">
              <span className={`walrus-bar block h-full rounded-full bg-lime ${walrus === "saved" ? "done" : ""}`} />
            </span>
          )}
        </span>
        {stamp.state === "stamped" && (
          <a
            href={explorerTxUrl(stamp.digest)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-lime px-[11px] text-[12px] font-bold text-ink no-underline hover:text-ink"
          >
            View on Sui
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M3 7 L7 3 M4 3 H7 V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
        {stamp.state === "failed" && (
          <button type="button" onClick={onRetry} disabled={busy} className="press min-h-11 shrink-0 cursor-pointer rounded-full bg-lime px-3 text-[12px] font-bold text-ink">
            Try again
          </button>
        )}
      </div>
      {DUST.map(([left, dx, dy, size], i) => (
        <span
          key={i}
          aria-hidden="true"
          className="dust pointer-events-none absolute bottom-0 z-10 rounded-full bg-[rgba(11,26,20,0.35)] blur-[0.8px]"
          style={{ left: `${left}%`, width: size, height: size, marginLeft: -size / 2, "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** Signed out: tapping a pick opens this instead. Nothing is saved or stamped until they sign in. */
function SignInToLock({ label, next }: { label: string; next: string }) {
  return (
    <div role="dialog" aria-label="Sign in to make your call" className="reveal glass flex flex-col gap-3 rounded-[20px] border border-[rgba(11,26,20,0.1)] p-4">
      <span className="flex flex-col gap-1">
        <span className="font-display text-[18px] font-extrabold tracking-[-0.02em]">Sign in to lock &ldquo;{label}&rdquo;</span>
        <span className="text-[14px] leading-[1.45] text-muted">
          It&apos;s free. We need it so your calls are saved to you, and nobody else can make them for you.
        </span>
      </span>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button className="press min-h-12 w-full cursor-pointer rounded-[14px] bg-ink text-[15px] font-bold text-white">Continue with Google</button>
      </form>
      <Link
        href={`/login?email=1&next=${encodeURIComponent(next)}`}
        className="press inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[rgba(11,26,20,0.14)] text-[14px] font-semibold no-underline"
      >
        Continue with email
      </Link>
    </div>
  );
}

/**
 * "Your call": three buttons named after the teams. Tapping one shows the stamp card straight away in a
 * "Stamping on Sui..." state; the server answers as soon as Sui confirms (about a second), and the call is
 * saved to Walrus in the background. `autoPick` is a pick made before signing in, stamped on arrival.
 */
export function YourCall({
  matchId,
  home,
  away,
  current,
  signedIn,
  note = null,
  autoPick,
}: {
  matchId: string;
  home: string;
  away: string;
  current: CurrentCall | null;
  signedIn: boolean;
  /** Your record when you went against the odds, shown above the buttons. */
  note?: string | null;
  autoPick: Call | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ask, setAsk] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<{ pick: Call; stamp: Stamp; key: number } | null>(null);

  const fromServer: { pick: Call; stamp: Stamp } | null = current
    ? {
        pick: current.pick,
        stamp:
          current.suiStatus === "stamped" && current.suiDigest && current.stampedAt
            ? { state: "stamped", digest: current.suiDigest, stampedAt: current.stampedAt }
            : current.suiStatus === "failed"
              ? { state: "failed" }
              : { state: "waiting" }, // saved but not on Sui yet: the hourly job stamps it
      }
    : null;
  const shown = local ?? fromServer;
  // Saved on Walrus: from the page, or from the quick check below. Only for the stamp we're showing (not the call before a change).
  const [savedDigest, setSavedDigest] = useState<string | null>(null);
  const shownDigest = shown?.stamp.state === "stamped" ? shown.stamp.digest : null;
  const walrus: CurrentCall["walrus"] = !shownDigest
    ? null
    : savedDigest === shownDigest || (current?.suiDigest === shownDigest && current.walrus === "saved")
      ? "saved"
      : "saving";
  const cardKey = local ? `l${local.key}` : `s${current?.version ?? 0}`;

  const finish = (pick: Call, key: number, state: CallState) => {
    if (state.error) {
      setError(state.error);
      setLocal(null);
      return;
    }
    setLocal({ pick, key, stamp: state.stamp ? { state: "stamped", ...state.stamp } : state.waiting ? { state: "waiting" } : { state: "failed" } });
    router.refresh(); // pick up the saved call and its Walrus status in the background
  };

  const choose = (pick: Call) => {
    if (!signedIn) {
      setAsk(pick);
      return;
    }
    setError(null);
    const key = Date.now();
    setLocal({ pick, key, stamp: { state: "stamping" } }); // the card lands right away
    startTransition(async () => finish(pick, key, await makeCallAction(matchId, pick)));
  };
  const retry = () => {
    if (!shown) return;
    const pick = shown.pick;
    const key = Date.now();
    setLocal({ pick, key, stamp: { state: "stamping" } });
    startTransition(async () => finish(pick, key, await retryStampAction(matchId)));
  };

  // A pick made before signing in: stamp it once, as soon as we're back.
  const autoDone = useRef(false);
  useEffect(() => {
    if (!autoPick || !signedIn || autoDone.current) return;
    // The flag is set inside the timer, so a cancelled first run (React runs effects twice in development) still stamps.
    const t = setTimeout(() => {
      if (autoDone.current) return;
      autoDone.current = true;
      router.replace(`/#match-${matchId}`, { scroll: false });
      if (current?.pick !== autoPick) choose(autoPick);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on arrival
  }, [autoPick, signedIn]);

  // Walrus saves 20 to 23 seconds after the stamp. Ask a small endpoint every 2 seconds (up to 2 minutes) instead of
  // reloading the whole page, then refresh once so the rest of the page catches up.
  const waitingFor = walrus === "saving" ? shownDigest : null;
  useEffect(() => {
    if (!waitingFor) return;
    let tries = 0;
    let stopped = false;
    const t = setInterval(async () => {
      if (++tries > 60) return clearInterval(t);
      try {
        const res = await fetch(`/api/walrus-status?digest=${waitingFor}`, { cache: "no-store" });
        if (!stopped && res.ok && (await res.json()).saved) {
          clearInterval(t);
          setSavedDigest(waitingFor);
          router.refresh();
        }
      } catch {
        // offline for a moment: try again on the next tick
      }
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [waitingFor, router]);

  const next = (pick: Call) => `/?call=${matchId}.${pick}#match-${matchId}`;

  return (
    <div className="flex flex-col gap-3">
      <div key={shown?.stamp.state === "stamped" ? `thud-${cardKey}` : "row"} className={`flex flex-col gap-2 ${shown?.stamp.state === "stamped" ? "thud" : ""}`}>
        <span className="font-display text-[16px] font-bold">Your call</span>
        {signedIn && note && <p className="m-0 rounded-2xl bg-[rgba(11,26,20,0.04)] px-3.5 py-2.5 text-[14px] leading-normal text-ink-2">{note}</p>}
        <div className="grid grid-cols-3 gap-2">
          {CALLS.map((pick) => {
            const on = (ask ?? shown?.pick) === pick;
            return (
              <button
                key={pick}
                type="button"
                aria-pressed={on}
                disabled={pending}
                onClick={() => choose(pick)}
                className={`press min-h-12 cursor-pointer rounded-2xl px-1.5 text-[14px] leading-tight ${
                  on ? "border border-ink bg-ink font-bold text-white" : "border border-[rgba(11,26,20,0.12)] bg-[rgba(255,255,255,0.8)] font-semibold text-ink"
                }`}
              >
                {callLabel(pick, home, away)}
              </button>
            );
          })}
        </div>
      </div>
      {!signedIn && ask && <SignInToLock label={callLabel(ask, home, away)} next={next(ask)} />}
      {signedIn && shown && (
        <StampCard key={cardKey} label={callLabel(shown.pick, home, away)} stamp={shown.stamp} walrus={walrus} onRetry={retry} busy={pending} />
      )}
      {error && <p className="m-0 text-[13px] font-semibold text-loss">{error}</p>}
    </div>
  );
}
