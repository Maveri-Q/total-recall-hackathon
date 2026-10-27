// When a match is due a reading. Pure functions, tested in schedule.test.ts.
//
// - Day-before reading: from 06:00 UTC, for matches kicking off more than 4 and at most 24 hours away.
// - Pre-kickoff reading: 1 to 4 hours before kickoff (aim 2 to 4; the extra hour covers late runs).
// - When credits are low, pre-kickoff readings are skipped so day-before readings keep going.

export type ReadingKind = "day_before" | "pre_kickoff";

const HOUR = 60 * 60 * 1000;
export const DAY_BEFORE_FROM_UTC_HOUR = 6;
export const LOW_CREDITS = 60;

export function dueReadings(
  kickoffAt: string,
  alreadyTaken: ReadingKind[],
  now: Date,
  creditsRemaining: number | null,
): ReadingKind[] {
  const untilKickoff = new Date(kickoffAt).getTime() - now.getTime();
  const due: ReadingKind[] = [];

  if (
    !alreadyTaken.includes("day_before") &&
    now.getUTCHours() >= DAY_BEFORE_FROM_UTC_HOUR &&
    untilKickoff > 4 * HOUR &&
    untilKickoff <= 24 * HOUR
  ) {
    due.push("day_before");
  }

  const lowCredits = creditsRemaining !== null && creditsRemaining < LOW_CREDITS;
  if (!alreadyTaken.includes("pre_kickoff") && !lowCredits && untilKickoff >= 1 * HOUR && untilKickoff <= 4 * HOUR) {
    due.push("pre_kickoff");
  }

  return due;
}

/** Bookie and Polymarket fetches more than this far apart are "out of sync". */
export const MAX_FETCH_GAP_MS = 5 * 60 * 1000;

export function inSync(oddsFetchedAt: string, polyFetchedAt: string | null): boolean {
  if (!polyFetchedAt) return false;
  return Math.abs(new Date(oddsFetchedAt).getTime() - new Date(polyFetchedAt).getTime()) <= MAX_FETCH_GAP_MS;
}
