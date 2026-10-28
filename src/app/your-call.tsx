"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { callLabel, CALLS, type Call } from "@/lib/call-result";
import { makeCallAction } from "./calls/actions";

/** "Your call:" with three buttons named after the teams. The current call is shown pressed. */
export function YourCall({
  matchId,
  homeTeam,
  awayTeam,
  current,
  signedIn,
  stamping,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  current: Call | null;
  signedIn: boolean;
  /** True while the current call is waiting for its Sui stamp. */
  stamping: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Light up the tapped button straight away. If saving fails, it falls back to the saved call.
  const [shown, setShown] = useOptimistic(current);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // The stamp lands a few seconds after the tap. Check back until the proof shows (or give up after a minute).
  useEffect(() => {
    if (!stamping) return;
    let tries = 0;
    const timer = setInterval(() => {
      if (++tries > 12) clearInterval(timer);
      else router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [stamping, router]);

  const choose = (pick: Call) =>
    startTransition(async () => {
      setError(null);
      setShown(pick);
      const state = await makeCallAction(matchId, pick);
      if (state.error) setError(state.error);
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">Your call:</span>
        {CALLS.map((pick) => {
          const label = callLabel(pick, homeTeam, awayTeam);
          const chosen = shown === pick;
          return signedIn ? (
            <button
              key={pick}
              type="button"
              disabled={pending}
              aria-pressed={chosen}
              onClick={() => choose(pick)}
              className={`border px-3 py-1 ${chosen ? "bg-white font-bold text-black" : ""}`}
            >
              {label}
            </button>
          ) : (
            <Link key={pick} href="/login" className="border px-3 py-1">
              {label}
            </Link>
          );
        })}
      </div>
      {pending && <p className="text-sm">Saving your call…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
