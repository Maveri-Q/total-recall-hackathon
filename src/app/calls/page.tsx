import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { callLabel, callRecord } from "@/lib/call-result";
import { listMyCalls, type CallVersion, type MyCall } from "@/lib/calls";
import { explorerTxUrl } from "@/lib/sui-stamp";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { KickoffTime } from "../kickoff-time";
import { LocalTime } from "../local-time";

export default function YourCalls() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Your calls</h1>
        <Link href="/" className="underline">
          Coming up
        </Link>
      </div>
      <Suspense fallback={<p>Loading your calls…</p>}>
        <Calls />
      </Suspense>
    </main>
  );
}

async function Calls() {
  // Calls are personal and lock at kickoff, so always render them fresh.
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const calls = await listMyCalls();
  const record = callRecord(calls.map((c) => c.outcome));

  return (
    <>
      <form action={signOut} className="flex items-center justify-between gap-2 text-sm">
        <span>{user.email}</span>
        <button className="underline">Log out</button>
      </form>

      {record.settled > 0 && (
        <p className="font-bold">
          You&apos;ve called {record.right} of {record.settled} right so far.
        </p>
      )}

      {calls.length === 0 ? (
        <p>
          No calls yet. Make one on{" "}
          <Link href="/" className="underline">
            Coming up
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {calls.map((c) => (
            <CallCard key={c.id} call={c} />
          ))}
        </ul>
      )}
    </>
  );
}

function CallCard({ call: c }: { call: MyCall }) {
  const latest = c.versions.at(-1)!;
  const score = c.game?.home_goals != null ? `Full time: ${c.homeTeam} ${c.game.home_goals}-${c.game.away_goals} ${c.awayTeam}. ` : "";
  const status = !c.matchId
    ? "Made before Your call existed, so it won't be scored."
    : {
        open: "You can change it until kickoff.",
        waiting: "Locked at kickoff. Waiting for full time.",
        called_it: `${score}You called it.`,
        not_this_time: `${score}Not this time.`,
        postponed: "Game postponed. This one won't count.",
        cancelled: "Game cancelled. This one won't count.",
      }[c.outcome];

  return (
    <li className="flex flex-col gap-1 border p-3">
      <p className="font-bold">
        {c.homeTeam} vs {c.awayTeam} · <KickoffTime iso={c.kickoffAt} />
      </p>
      <p>Your call: {callLabel(latest.pick, c.homeTeam, c.awayTeam)}</p>
      <p className={c.outcome === "called_it" || c.outcome === "not_this_time" ? "font-bold" : ""}>{status}</p>
      <p className="text-sm">
        <Proof version={latest} />
      </p>
      {c.versions.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer underline">
            You changed your call {c.versions.length - 1} {c.versions.length === 2 ? "time" : "times"} before kickoff
          </summary>
          <ol className="mt-1 flex flex-col gap-1">
            {c.versions.map((v) => (
              <li key={v.id}>
                {callLabel(v.pick, c.homeTeam, c.awayTeam)}, saved <LocalTime iso={v.created_at} /> · <Proof version={v} />
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}

function Proof({ version: v }: { version: CallVersion }) {
  if (v.sui_status === "stamped" && v.sui_digest) {
    return (
      <>
        Stamped on Sui ·{" "}
        <a href={explorerTxUrl(v.sui_digest)} target="_blank" rel="noreferrer" className="underline">
          see proof
        </a>
      </>
    );
  }
  if (v.sui_status === "failed") return <>Couldn&apos;t stamp on Sui yet. We&apos;ll try again.</>;
  if (v.sui_status === "not_applicable") return <>Imported, so never stamped on Sui.</>;
  return <>Not stamped on Sui yet.</>;
}
