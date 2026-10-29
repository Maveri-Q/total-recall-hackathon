// The text of every memory saved to Walrus, plus the counting behind source records.
// Pure functions, no network or database. The numbers are worked out here, in code, never by Walrus.
//
// One vote per match: a graded match counts once in a source record, using its pre-kickoff reading
// if that one is usable, otherwise its day-before reading. Unusable readings never count.
import { biggestGap, type Outcome, type ThreeWay } from "../odds";

/** Below this many counted matches, a record is labelled an early signal. */
export const EARLY_SIGNAL_MATCHES = 10;

export const NAMESPACES = { reading: "readings", match_result: "results", source_record: "records", call: "calls" } as const;

export type MatchInfo = {
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export type ReadingRow = {
  id: string;
  kind: "day_before" | "pre_kickoff";
  odds_fetched_at: string;
  bookie_count: number;
  bookie_home: number | string | null;
  bookie_draw: number | string | null;
  bookie_away: number | string | null;
  poly_status: "ok" | "thin_market" | "not_found";
  poly_volume: number | string | null;
  poly_home: number | string | null;
  poly_draw: number | string | null;
  poly_away: number | string | null;
  in_sync: boolean;
  usable: boolean;
  content_hash: string;
  sui_digest: string | null;
  sui_status?: "pending" | "stamped" | "failed";
  bookie_brier?: number | string | null;
  poly_brier?: number | string | null;
  closer?: "bookies" | "polymarket" | "tie" | null;
};

// Supabase returns Postgres numeric as text or a number. Accept both.
function threeWay(h: unknown, d: unknown, a: unknown): ThreeWay | null {
  if (h === null || d === null || a === null || h === undefined) return null;
  return { home: Number(h), draw: Number(d), away: Number(a) };
}
const bookiesOf = (r: ReadingRow) => threeWay(r.bookie_home, r.bookie_draw, r.bookie_away);
const polyOf = (r: ReadingRow) => threeWay(r.poly_home, r.poly_draw, r.poly_away);

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const usd = (x: number | string) => `$${Math.round(Number(x)).toLocaleString("en-GB")}`;
const brier = (x: number | string) => Number(x).toFixed(3);

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).replace(",", ""); // "Tue 27 Oct 2026"
}
function kickoff(iso: string): string {
  return `${day(iso)} ${iso.slice(11, 16)} UTC`;
}

function outcomeName(o: Outcome, m: MatchInfo): string {
  return o === "home" ? m.homeTeam : o === "away" ? m.awayTeam : "the draw";
}

export type GapBand = "small" | "medium" | "big";
export function gapBand(points: number): GapBand {
  return points < 5 ? "small" : points < 10 ? "medium" : "big";
}
const BAND_TEXT: Record<GapBand, string> = {
  small: "small gap (under 5 points)",
  medium: "medium gap (5 to 10 points)",
  big: "big gap (10 points or more)",
};

/** The outcome where bookies and Polymarket disagree most, or null without both. */
export function readingGap(r: ReadingRow): { outcome: Outcome; points: number; polyHigher: boolean } | null {
  const b = bookiesOf(r);
  const p = polyOf(r);
  if (!b || !p) return null;
  const gap = biggestGap(b, p);
  return { ...gap, polyHigher: p[gap.outcome] > b[gap.outcome] };
}

function whyNotCounted(r: ReadingRow): string {
  if (r.poly_status === "not_found") return "no Polymarket market for this match";
  if (r.poly_status === "thin_market") return `Polymarket market too thin (${usd(r.poly_volume ?? 0)} traded)`;
  if (!r.in_sync) return "bookie and Polymarket prices fetched more than 5 minutes apart";
  return "missing prices";
}

function threeWayText(c: ThreeWay, m: MatchInfo): string {
  return `${m.homeTeam} ${pct(c.home)}, draw ${pct(c.draw)}, ${m.awayTeam} ${pct(c.away)}`;
}

function beforeKickoff(r: ReadingRow, m: MatchInfo): string {
  const mins = Math.round((Date.parse(m.kickoffAt) - Date.parse(r.odds_fetched_at)) / 60_000);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

const KIND_TEXT = { day_before: "Day-before reading", pre_kickoff: "Pre-kickoff reading" } as const;

/** Memory for one stamped reading. */
export function readingMemoryText(m: MatchInfo, r: ReadingRow): string {
  const b = bookiesOf(r);
  const p = polyOf(r);
  const parts = [
    `Odds reading for ${m.homeTeam} v ${m.awayTeam} (${m.leagueName}), kickoff ${kickoff(m.kickoffAt)}.`,
    `${KIND_TEXT[r.kind]}, taken ${beforeKickoff(r, m)} before kickoff.`,
    b ? `Bookies (middle of ${r.bookie_count}): ${threeWayText(b, m)}.` : "Bookies: no odds.",
    r.poly_status === "not_found"
      ? "Polymarket: no market for this match."
      : p
        ? `Polymarket (${usd(r.poly_volume ?? 0)} traded): ${threeWayText(p, m)}.`
        : "Polymarket: no prices.",
  ];
  const gap = readingGap(r);
  if (gap) {
    parts.push(
      `Biggest gap: ${outcomeName(gap.outcome, m)}, Polymarket ${gap.points.toFixed(1)} points ` +
        `${gap.polyHigher ? "higher" : "lower"}, a ${BAND_TEXT[gapBand(gap.points)]}.`,
    );
  }
  parts.push(r.usable ? "Counts towards source records once graded." : `Won't count towards source records: ${whyNotCounted(r)}.`);
  if (r.sui_digest) parts.push(`Stamped on Sui Mainnet, transaction ${r.sui_digest}.`);
  parts.push(`Fingerprint (sha256): ${r.content_hash}.`);
  return parts.join(" ");
}

export type Verdict = {
  kind: ReadingRow["kind"];
  closer: "bookies" | "polymarket" | "tie";
  bookieBrier: number;
  polyBrier: number;
  gapPoints: number;
};

/** The one reading that counts for a graded match, or null if none is usable. */
export function matchVerdict(readings: ReadingRow[]): Verdict | null {
  for (const kind of ["pre_kickoff", "day_before"] as const) {
    const r = readings.find((x) => x.kind === kind);
    const gap = r && readingGap(r);
    if (r && r.usable && r.closer && gap && r.bookie_brier != null && r.poly_brier != null) {
      return { kind, closer: r.closer, bookieBrier: Number(r.bookie_brier), polyBrier: Number(r.poly_brier), gapPoints: gap.points };
    }
  }
  return null;
}

const CLOSER_TEXT = { bookies: "The bookies were closer.", polymarket: "Polymarket was closer.", tie: "Level: both equally close." };

/** Memory for one graded match: score, both readings, who was closer. */
export function matchResultMemoryText(
  m: MatchInfo,
  score: { homeGoals: number; awayGoals: number; result: Outcome },
  readings: ReadingRow[],
): string {
  const winner = score.result === "draw" ? "Draw" : `${outcomeName(score.result, m)} win`;
  const parts = [
    `Graded match: ${m.homeTeam} ${score.homeGoals}-${score.awayGoals} ${m.awayTeam} (${m.leagueName}, ${day(m.kickoffAt)}).`,
    `Result after 90 minutes: ${winner}.`,
  ];
  for (const kind of ["pre_kickoff", "day_before"] as const) {
    const r = readings.find((x) => x.kind === kind);
    if (!r) continue;
    const b = bookiesOf(r);
    const p = polyOf(r);
    const name = score.result === "draw" ? "a draw" : outcomeName(score.result, m);
    if (b && p) {
      const gap = readingGap(r)!;
      parts.push(
        `${KIND_TEXT[kind]}: bookies gave ${name} ${pct(b[score.result])}, Polymarket ${pct(p[score.result])}.`,
        `Biggest gap ${gap.points.toFixed(1)} points on ${outcomeName(gap.outcome, m)}, ${BAND_TEXT[gapBand(gap.points)]}.`,
      );
    } else if (b) {
      parts.push(`${KIND_TEXT[kind]}: bookies gave ${name} ${pct(b[score.result])}.`);
    }
    if (r.bookie_brier != null) {
      parts.push(
        `Brier score, lower is better: bookies ${brier(r.bookie_brier)}` +
          (r.poly_brier != null ? `, Polymarket ${brier(r.poly_brier)}.` : "."),
      );
    }
    parts.push(r.usable && r.closer ? CLOSER_TEXT[r.closer] : `Not counted: ${whyNotCounted(r)}.`);
  }
  const verdict = matchVerdict(readings);
  parts.push(
    verdict
      ? `This match counts once in the ${m.leagueName} source record, using the ${KIND_TEXT[verdict.kind].toLowerCase()}.`
      : "This match doesn't count in the source record: no usable reading.",
  );
  return parts.join(" ");
}

export type SourceRecord = {
  matches: number;
  polymarket: number;
  bookies: number;
  ties: number;
  avgBookieBrier: number | null;
  avgPolyBrier: number | null;
  byBand: Record<GapBand, { matches: number; polymarket: number; bookies: number; ties: number }>;
};

/** Counts who was closer across matches. Deterministic: same verdicts in, same record out. */
export function sourceRecord(verdicts: Verdict[]): SourceRecord {
  const empty = () => ({ matches: 0, polymarket: 0, bookies: 0, ties: 0 });
  const rec: SourceRecord = {
    ...empty(),
    avgBookieBrier: null,
    avgPolyBrier: null,
    byBand: { small: empty(), medium: empty(), big: empty() },
  };
  for (const v of verdicts) {
    const band = rec.byBand[gapBand(v.gapPoints)];
    for (const t of [rec, band]) {
      t.matches++;
      t[v.closer === "tie" ? "ties" : v.closer]++;
    }
  }
  if (verdicts.length > 0) {
    rec.avgBookieBrier = verdicts.reduce((s, v) => s + v.bookieBrier, 0) / verdicts.length;
    rec.avgPolyBrier = verdicts.reduce((s, v) => s + v.polyBrier, 0) / verdicts.length;
  }
  return rec;
}

/** Memory for a source record. `scope` is a league name or "all leagues". */
export function sourceRecordMemoryText(scope: string, rec: SourceRecord, asOf: string): string {
  const parts = [
    `Source record, ${scope}, after ${rec.matches} graded ${rec.matches === 1 ? "match" : "matches"} (to ${day(asOf)}).`,
    `Polymarket was closer in ${rec.polymarket}, the bookies in ${rec.bookies}, level in ${rec.ties}.`,
  ];
  if (rec.avgBookieBrier !== null && rec.avgPolyBrier !== null) {
    parts.push(`Average Brier score, lower is better: bookies ${brier(rec.avgBookieBrier)}, Polymarket ${brier(rec.avgPolyBrier)}.`);
  }
  const bands = (["small", "medium", "big"] as const)
    .filter((b) => rec.byBand[b].matches > 0)
    .map((b) => {
      const t = rec.byBand[b];
      return `${BAND_TEXT[b]}: ${t.matches} ${t.matches === 1 ? "match" : "matches"}, Polymarket closer ${t.polymarket}, bookies ${t.bookies}, level ${t.ties}`;
    });
  if (bands.length) parts.push(`By gap size: ${bands.join("; ")}.`);
  if (rec.matches < EARLY_SIGNAL_MATCHES) {
    parts.push(`Early signal only: fewer than ${EARLY_SIGNAL_MATCHES} matches.`);
  }
  return parts.join(" ");
}

/** What to ask Walrus for when looking up past cases like this upcoming match. */
export function similarCasesQuery(m: MatchInfo, gap: { outcome: Outcome; points: number } | null): string {
  const base = `Graded match in the ${m.leagueName}: ${m.homeTeam} v ${m.awayTeam}.`;
  if (!gap) return `${base} Who was closer, the bookies or Polymarket?`;
  return (
    `${base} Bookies and Polymarket disagreed by ${gap.points.toFixed(1)} points on ${outcomeName(gap.outcome, m)}, ` +
    `a ${BAND_TEXT[gapBand(gap.points)]}. Who was closer?`
  );
}

/** What to ask Walrus for when looking up a league's source record. */
export function sourceRecordQuery(leagueName: string): string {
  return `Source record, ${leagueName}: how often Polymarket and the bookies were closer.`;
}

/** What to ask Walrus for when scoring the sources on past games like this one: same league, similar gap. */
export function bandCasesQuery(leagueName: string, band: GapBand): string {
  return `Graded match in the ${leagueName}. Bookies and Polymarket disagreed by a ${BAND_TEXT[band]}. Who was closer?`;
}

// Short lines for the Memory page feed (the `summary` column).
export function readingSummary(m: MatchInfo, r: ReadingRow): string {
  const game = `${m.homeTeam} v ${m.awayTeam}`;
  const b = bookiesOf(r);
  const p = polyOf(r);
  const gap = readingGap(r);
  if (!b) return `${game}. Odds saved.`;
  if (!p || !gap) return `${game}. Bookies only, no Polymarket market.`;
  const what = gap.outcome === "draw" ? "a draw" : `${outcomeName(gap.outcome, m)} win`;
  return `${game}. Bookies ${Math.round(b[gap.outcome] * 100)}%, Polymarket ${Math.round(p[gap.outcome] * 100)}% for ${what}.`;
}
export function matchResultSummary(m: MatchInfo, score: { homeGoals: number; awayGoals: number }, readings: ReadingRow[]): string {
  const v = matchVerdict(readings);
  const line = `${m.homeTeam} ${score.homeGoals}-${score.awayGoals} ${m.awayTeam}.`;
  return v ? `${line} ${CLOSER_TEXT[v.closer]}` : `${line} Not counted: no usable reading.`;
}
export function sourceRecordSummary(scope: string, rec: SourceRecord): string {
  return `${scope}: Bookies ${rec.bookies}, Polymarket ${rec.polymarket}, from ${rec.matches} ${rec.matches === 1 ? "game" : "games"}.`;
}
export function callSummary(m: MatchInfo, pickLabel: string): string {
  return `${m.homeTeam} v ${m.awayTeam}. Picked ${pickLabel}.`;
}

/** Memory for one call (or one change to it), linked to an anonymous fan id only. */
export function callMemoryText(
  m: MatchInfo,
  call: { fanId: string; version: number; pickLabel: string; savedAt: string; suiDigest: string; contentHash: string },
): string {
  const mins = Math.max(0, Math.round((Date.parse(m.kickoffAt) - Date.parse(call.savedAt)) / 60_000));
  return [
    `Fan call by fan ${call.fanId}: ${call.pickLabel} on ${m.homeTeam} v ${m.awayTeam} (${m.leagueName}), kickoff ${kickoff(m.kickoffAt)}.`,
    call.version === 1 ? "First call on this game." : `Changed call, version ${call.version}.`,
    `Made ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m before kickoff.`,
    `Stamped on Sui Mainnet, transaction ${call.suiDigest}.`,
    `Fingerprint (sha256): ${call.contentHash}.`,
  ].join(" ");
}
