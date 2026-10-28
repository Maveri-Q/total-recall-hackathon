import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isLocked, pickLabel } from "@/lib/prediction-input";
import { listPredictions } from "@/lib/predictions";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { LocalTime } from "../local-time";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Your picks</h1>
      <Suspense fallback={<p>Loading your picks…</p>}>
        <Journal />
      </Suspense>
    </main>
  );
}

async function Journal() {
  // Picks are personal and lock at kickoff, so always render them fresh for each request.
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const predictions = await listPredictions();

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link href="/predictions/new" className="border px-4 py-2">
          New pick
        </Link>
        <form action={signOut} className="flex items-center gap-2 text-sm">
          <span>{user.email}</span>
          <button className="underline">Log out</button>
        </form>
      </div>

      {predictions.length === 0 ? (
        <p>No picks yet. Tap &ldquo;New pick&rdquo;, choose a match from this week&apos;s fixtures, and say who you think wins.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {predictions.map((p) => {
            const latest = p.versions.at(-1);
            return (
              <li key={p.id} className="border p-3">
                <Link href={`/predictions/${p.id}`} className="font-bold underline">
                  {p.home_team} vs {p.away_team}
                </Link>
                <p className="text-sm">
                  {p.league} · <LocalTime iso={p.kickoff_at} />
                </p>
                {latest && (
                  <p>
                    {pickLabel(latest.pick, p.home_team, p.away_team)}, {latest.confidence}% sure
                    {latest.version > 1 && ` (version ${latest.version})`}
                  </p>
                )}
                <p className="text-sm">
                  {p.origin === "imported"
                    ? "Imported from our spreadsheet"
                    : isLocked(p.kickoff_at)
                      ? "Locked at kickoff"
                      : "You can still change this until kickoff"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
