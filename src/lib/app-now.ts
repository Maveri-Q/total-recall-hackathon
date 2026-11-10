// "Now" for the server. Always the real time on the live site.
//
// For recording the demo video during the international break (no upcoming game has odds yet), running the app
// on a laptop with `next dev` and VERNIER_REPLAY_AT=<ISO time> shows the pages as they stood at that moment,
// from the real saved readings, stamps and Walrus memories. It never applies in production builds.
export function appNow(): Date {
  const replay = process.env.NODE_ENV === "development" ? process.env.VERNIER_REPLAY_AT : undefined;
  return replay ? new Date(replay) : new Date();
}

/** True while replaying a past moment (laptop only). */
export const isReplay = () => process.env.NODE_ENV === "development" && !!process.env.VERNIER_REPLAY_AT;
