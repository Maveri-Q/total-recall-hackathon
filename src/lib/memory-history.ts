// "How this changed" on Records: how each league's record moved as games were graded. Pure functions.
//
// Every time a league's count grows, the data job saves the new record to Walrus as a memory
// (ref_key "SA:10" is the Serie A record after 10 games; see queueMemories in data-job/remember.ts).
// Those saved memories are the steps shown here, each with the date it was saved and its Walrus blob,
// so nothing is worked out after the fact.
//
// On 1 Nov 2026 grading gained "too close to call" (grading.ts). Records saved before that used the old rule,
// so they are left out here; records under the new rule have keys ending in RECORD_KEY_SUFFIX ("SA:10:tc").

export type RecordMemory = { ref_key: string; summary: string | null; saved_at: string | null; blob_id: string | null };
export type RecordStep = { games: number; bookies: number; polymarket: number; tooClose: number; savedAt: string; blobId: string };

/** Marks a record memory saved under the "too close to call" rule. */
export const RECORD_KEY_SUFFIX = ":tc";

/** The memory key for a league's record after `games` graded games ("ALL" for all leagues). */
export const recordKey = (code: string, games: number) => `${code}:${games}${RECORD_KEY_SUFFIX}`;

/** Matches sourceRecordSummary: "Serie A: Bookies 3, Polymarket 7, too close to call 2, from 12 games." */
const SUMMARY = /Bookies (\d+), Polymarket (\d+), too close to call (\d+), from (\d+) games?/;

/** The saved steps of one league's record ("ALL" for all leagues), fewest games first. */
export function recordSteps(memories: RecordMemory[], code: string): RecordStep[] {
  const steps: RecordStep[] = [];
  for (const m of memories) {
    if (!m.saved_at || !m.blob_id) continue;
    const found = m.summary?.match(SUMMARY);
    if (!found) continue;
    const games = Number(found[4]);
    if (m.ref_key !== recordKey(code, games)) continue; // the summary must be the record its key says
    steps.push({ games, bookies: Number(found[1]), polymarket: Number(found[2]), tooClose: Number(found[3]), savedAt: m.saved_at, blobId: m.blob_id });
  }
  return steps.sort((a, b) => a.games - b.games);
}

/** Who led at a step, for the colour and the screen-reader label. */
export function leader(s: Pick<RecordStep, "bookies" | "polymarket">): "bookies" | "polymarket" | "level" {
  return s.bookies > s.polymarket ? "bookies" : s.polymarket > s.bookies ? "polymarket" : "level";
}
