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

/** The hourly job starts at this minute past each hour (Supabase pg_cron, migration 0004). */
export const RUN_MINUTE = 17;

/**
 * Roughly when a match gets its first reading, for "Odds come in around ...". The day-before window opens
 * 24 hours before kickoff, but not before 06:00 UTC that day. Then it waits for the next run at :17.
 */
export function firstReadingAt(kickoffAt: string): Date {
  const kickoff = Date.parse(kickoffAt);
  let from = new Date(kickoff - 24 * HOUR);
  if (from.getUTCHours() < DAY_BEFORE_FROM_UTC_HOUR) {
    from = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), DAY_BEFORE_FROM_UTC_HOUR));
  }
  const run = new Date(from);
  run.setUTCMinutes(RUN_MINUTE, 0, 0);
  if (run < from) run.setUTCHours(run.getUTCHours() + 1);
  return run;
}
