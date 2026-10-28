import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { bandScore, bookiesOf, getUpcomingMatches, polyOf, type UpcomingMatch } from "@/lib/coming-up";
import type { ReadingRow } from "@/lib/data-job/memories";
import type { Outcome } from "@/lib/odds";
import { favourite, headline, MIN_GAMES_FOR_SCORE } from "@/lib/scoreline";
import { explorerTxUrl } from "@/lib/sui-stamp";
import { getCurrentUser } from "@/lib/supabase/server";
import { myCallsOn, type CallVersion, type MyCall } from "@/lib/calls";
import { Info } from "./info";
import { KickoffTime } from "./kickoff-time";
import { YourCall } from "./your-call";

export default function ComingUp() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Coming up</h1>
        <Link href="/calls" className="underline">
          Your calls
        </Link>
      </div>
      <Suspense fallback={<p>Loading games…</p>}>
        <Matches />
      </Suspense>
    </main>
  );
}

async function Matches() {
  await connection();
  const matches = await getUpcomingMatches(new Date());
  if (matches.length === 0) return <p>No games in the next day. We check every hour.</p>;
  const user = await getCurrentUser();
  const calls = user ? await myCallsOn(matches.map((m) => m.id)) : new Map<string, MyCall>();
  return (
    <ul className="flex flex-col gap-3">
      {matches.map((m) => {
        const call = calls.get(m.id)?.versions.at(-1) ?? null;
        return (
          <li key={m.id} className="flex flex-col gap-1 border p-3">
            <p className="font-bold">
              {m.homeTeam} vs {m.awayTeam} · <KickoffTime iso={m.kickoffAt} />
            </p>
            <Odds match={m} />
            <YourCall matchId={m.id} homeTeam={m.homeTeam} awayTeam={m.awayTeam} current={call?.pick ?? null} signedIn={!!user} />
            {call && <CallProof version={call} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Each call is stamped on Sui the moment it's made, so it's provably from before kickoff. */
function CallProof({ version }: { version: CallVersion }) {
  if (version.sui_status === "stamped" && version.sui_digest) {
    return (
      <p className="text-sm">
        Your call is stamped on Sui ·{" "}
        <a href={explorerTxUrl(version.sui_digest)} target="_blank" rel="noreferrer" className="underline">
          see proof
        </a>
        . You can change it until kickoff.
      </p>
    );
  }
  if (version.sui_status === "failed") return <p className="text-sm">Couldn&apos;t stamp your call on Sui yet. We&apos;ll try again.</p>;
  return <p className="text-sm">Stamping your call on Sui…</p>;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

function resultName(o: Outcome, m: UpcomingMatch): string {
  return o === "home" ? m.homeTeam : o === "away" ? m.awayTeam : "Draw";
}

function BookiesInfo({ id }: { id: string }) {
  return (
    <Info id={`bookies-${id}`} label="About the bookies' chance">
      We turn the bookies&apos; odds into a chance, so you can compare them with Polymarket.
    </Info>
  );
}

function Odds({ match: m }: { match: UpcomingMatch }) {
  const r = m.reading;
  const bookies = r && bookiesOf(r);
  if (!r || !bookies) return <p>No odds yet. We check them the day before kickoff.</p>;

  const poly = r.poly_status === "not_found" ? null : polyOf(r);
  if (!poly) {
    const fav = favourite(bookies);
    return (
      <>
        <p>
          Bookies: {resultName(fav, m)} {pct(bookies[fav])}
          <BookiesInfo id={m.id} />
        </p>
        <p>No Polymarket market for this game.</p>
        <SuiProof reading={r} />
      </>
    );
  }

  const h = headline(bookies, poly);
  return (
    <>
      <p>
        Bookies: {resultName(h.outcome, m)} {pct(h.bookies)}
        <BookiesInfo id={m.id} /> · Polymarket: {resultName(h.outcome, m)} {pct(h.poly)}
        <Info id={`poly-${m.id}`} label="What is Polymarket?">
          Polymarket is a site where people put real money on what will happen. Its price shows the chance they give each
          result.
        </Info>
      </p>
      {r.poly_status === "thin_market" && (
        <p className="text-sm">Not much money on Polymarket for this game yet, so its price can jump around.</p>
      )}
      <SuiProof reading={r} />
      <Suspense fallback={<p className="text-sm">Checking past games…</p>}>
        <Score match={m} band={h.band} />
      </Suspense>
    </>
  );
}

async function Score({ match: m, band }: { match: UpcomingMatch; band: Parameters<typeof bandScore>[1] }) {
  let score;
  try {
    score = await bandScore(m.leagueCode, band);
  } catch (e) {
    console.error("bandScore", e);
    return <p>Couldn&apos;t load past games right now. Try again in a minute.</p>;
  }

  return (
    <>
      {score.games >= MIN_GAMES_FOR_SCORE ? (
        <>
          <p className="font-bold">
            Bookies vs Polymarket: {score.bookies} – {score.polymarket}
            <Info id={`score-${m.id}`} label="About this score">
              After every game, we check who got closer to the real result. This is the score so far in games like this
              one.
            </Info>
          </p>
          <p className="text-sm">
            in {score.games} {m.leagueName} games where they disagreed this much
            {score.level > 0 && `. ${score.level} ${score.level === 1 ? "was" : "were"} level`}
          </p>
        </>
      ) : (
        <p>Not enough games like this yet. We&apos;ll show the score once we have {MIN_GAMES_FOR_SCORE}.</p>
      )}
      {score.recalled.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer underline">
            See the {score.recalled.length} past {score.recalled.length === 1 ? "game" : "games"} we compared
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {score.recalled.map((g) => (
              <li key={g.blobId} className="border-l-2 pl-2">
                <p className="font-bold">{g.label}</p>
                <p>{g.text}</p>
                <p className="opacity-70">Saved on Walrus: {g.blobId}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

/** Every reading's fingerprint is stamped on Sui before kickoff. This links to the proof. */
function SuiProof({ reading }: { reading: ReadingRow }) {
  if (reading.sui_status !== "stamped" || !reading.sui_digest) return <p className="text-sm">Not stamped yet</p>;
  return (
    <p className="text-sm">
      Stamped on Sui before kickoff ·{" "}
      <a href={explorerTxUrl(reading.sui_digest)} target="_blank" rel="noreferrer" className="underline">
        see proof
      </a>
    </p>
  );
}
