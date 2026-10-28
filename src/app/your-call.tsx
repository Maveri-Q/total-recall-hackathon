"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { callLabel, CALLS, type Call } from "@/lib/call-result";
import { makeCallAction } from "./calls/actions";

/** "Your call:" with three buttons named after the teams. The current call is shown pressed. */
export function YourCall({
  matchId,
  homeTeam,
  awayTeam,
  current,
  signedIn,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  current: Call | null;
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const choose = (pick: Call) =>
    startTransition(async () => {
      setError(null);
      const state = await makeCallAction(matchId, pick);
      if (state.error) setError(state.error);
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">Your call:</span>
        {CALLS.map((pick) => {
          const label = callLabel(pick, homeTeam, awayTeam);
          const chosen = current === pick;
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
