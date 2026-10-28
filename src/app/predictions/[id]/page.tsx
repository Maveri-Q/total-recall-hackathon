import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { isLocked, pickLabel } from "@/lib/prediction-input";
import { getPrediction } from "@/lib/predictions";
import { getCurrentUser } from "@/lib/supabase/server";
import { LocalTime } from "../../local-time";
import { SuiStatus } from "../sui-status";
import { EditPredictionForm } from "./edit-prediction-form";

export default function PredictionPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <Link href="/picks" className="underline">
        ← Your picks
      </Link>
      <Suspense fallback={<p>Loading…</p>}>
        <PredictionDetails params={params} />
      </Suspense>
    </main>
  );
}

async function PredictionDetails({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (!(await getCurrentUser())) redirect("/login");
  const { id } = await params;
  const p = await getPrediction(id);
  if (!p) notFound();

  const latest = p.versions.at(-1);
  if (!latest) notFound();
  const locked = p.origin === "imported" || isLocked(p.kickoff_at);

  return (
    <>
      <h1 className="text-2xl font-bold">
        {p.home_team} vs {p.away_team}
      </h1>
      <p>
        {p.league} · Kickoff <LocalTime iso={p.kickoff_at} />
      </p>
      {p.origin === "imported" && <p>Imported from our spreadsheet. Not locked onchain before kickoff.</p>}

      <section className="border p-3">
        <h2 className="font-bold">Current pick (version {latest.version})</h2>
        <p>
          {pickLabel(latest.pick, p.home_team, p.away_team)}, {latest.confidence}% sure
        </p>
        {latest.reason && <p>&ldquo;{latest.reason}&rdquo;</p>}
        <p>{latest.source ? `Following a tip from ${latest.source}` : "Your own call"}</p>
        <p>
          {locked
            ? "Locked. The match has kicked off, so this pick can't change."
            : "You can still change this until kickoff."}
        </p>
      </section>

      {!locked && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold">Change your pick</h2>
          <EditPredictionForm
            predictionId={p.id}
            latestVersion={latest.version}
            homeTeam={p.home_team}
            awayTeam={p.away_team}
            current={{
              pick: latest.pick,
              confidence: String(latest.confidence),
              reason: latest.reason ?? "",
              source: latest.source ?? "",
            }}
          />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">History</h2>
        <ol className="flex flex-col gap-2">
          {[...p.versions].reverse().map((v) => (
            <li key={v.id} className="border p-2 text-sm">
              <p>
                <strong>Version {v.version}</strong> · saved <LocalTime iso={v.created_at} />
              </p>
              <p>
                {pickLabel(v.pick, p.home_team, p.away_team)}, {v.confidence}% sure.{v.reason && <> &ldquo;{v.reason}&rdquo;</>}
                {v.source && ` Tip from ${v.source}.`}
              </p>
              <p>
                <SuiStatus version={v} />
              </p>
              <p className="break-all text-gray-600">
                Fingerprint: {v.content_hash}
                <br />
                This code is made from the pick above. If anyone changed a single letter later, the code
                wouldn&apos;t match the one on Sui.
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
