// The data job when things go wrong (the failure cases listed in CLAUDE.md). Every outside service is a
// stand-in, so these run without keys: The Odds API, Tatum (Polymarket and Sui), football-data.org,
// Walrus and the database. Each test breaks one thing and checks the job does the safe thing and carries on.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, writes, type DbAnswer, type DbCall } from "./test-db";

const services = vi.hoisted(() => ({
  db: null as unknown,
  listEvents: vi.fn(),
  fetchLeagueOdds: vi.fn(),
  findPolymarketMatch: vi.fn(),
  fetchPolymarketPrices: vi.fn(),
  getAppBalance: vi.fn(),
  stampHashes: vi.fn(),
  fetchLeagueResults: vi.fn(),
  queueMemories: vi.fn(),
  sendPendingMemories: vi.fn(),
}));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => services.db }));
vi.mock("../odds-api", () => ({ listEvents: services.listEvents, fetchLeagueOdds: services.fetchLeagueOdds }));
vi.mock("../tatum", () => ({
  findPolymarketMatch: services.findPolymarketMatch,
  fetchPolymarketPrices: services.fetchPolymarketPrices,
  getAppBalance: services.getAppBalance,
  stampHashes: services.stampHashes,
  stampingConfigured: () => true,
}));
vi.mock("../football-results", () => ({ fetchLeagueResults: services.fetchLeagueResults }));
vi.mock("./remember", () => ({ queueMemories: services.queueMemories, sendPendingMemories: services.sendPendingMemories }));

const { runDataJob } = await import("./run");

// Saturday 31 Oct, 09:30 UTC. Chelsea v Man United kicks off at 12:30: 3 hours away, so its pre-kickoff reading is due.
const now = new Date("2026-10-31T09:30:00Z");
const NOW = now.toISOString();
const event = { id: "ev1", homeTeam: "Chelsea", awayTeam: "Manchester United", kickoffAt: "2026-10-31T12:30:00Z" };
const match = {
  id: "m1",
  league_code: "PL",
  odds_api_id: "ev1",
  home_team: "Chelsea",
  away_team: "Manchester United",
  kickoff_at: event.kickoffAt,
  polymarket_status: "unchecked",
  polymarket_event_id: null,
  polymarket_title: null,
  polymarket_url: null,
  polymarket_markets: null,
};
const bookie = { key: "sport888", title: "888sport", last_update: NOW, home: 2.0, draw: 3.6, away: 3.9 };
const link = { eventId: "pm1", title: "Chelsea FC vs. Manchester United FC", url: null, markets: { home: "a", draw: "b", away: "c" } };
const prices = { eventId: "pm1", fetchedAt: NOW, volume: 250_000, yes: { home: 0.52, draw: 0.25, away: 0.23 } };

let calls: DbCall[];
/** Per-test answers, checked before the defaults below. */
let extra: (c: DbCall) => DbAnswer | undefined;
const has = (c: DbCall, filter: string, column: string) => c.filters.some(([f, args]) => f === filter && args[0] === column);

function answer(c: DbCall): DbAnswer | undefined {
  const own = extra(c);
  if (own) return own;
  if (c.table === "job_runs" && c.op === "insert") return { data: { id: "run1" } };
  if (c.table === "matches" && c.op === "upsert") return { data: [match] };
  const oneRow = c.filters.some(([f]) => f === "single" || f === "maybeSingle");
  return { data: c.op === "select" && !oneRow ? [] : null };
}

beforeEach(() => {
  vi.clearAllMocks();
  extra = () => undefined;
  const db = fakeDb(answer);
  services.db = db.client;
  calls = db.calls;
  services.listEvents.mockImplementation(async (key: string) => (key === "soccer_epl" ? [event] : []));
  services.fetchLeagueOdds.mockResolvedValue({ fetchedAt: NOW, byEventId: new Map([["ev1", [bookie]]]), creditsRemaining: 400, creditsUsed: 1 });
  services.findPolymarketMatch.mockResolvedValue(link);
  services.fetchPolymarketPrices.mockResolvedValue(prices);
  services.getAppBalance.mockResolvedValue({ address: "0xapp", mist: 5_000_000_000n });
  services.stampHashes.mockResolvedValue({ digest: "DIGEST" });
  services.fetchLeagueResults.mockResolvedValue([]);
  services.queueMemories.mockResolvedValue(undefined);
  services.sendPendingMemories.mockResolvedValue(undefined);
});

/** The job log is always closed, with the run's numbers, even when a step failed. */
function finishedRun() {
  const update = writes(calls, "job_runs", "update")[0] as { finished_at?: string; readings_saved?: number; log?: string[] } | undefined;
  expect(update?.finished_at).toBeTruthy();
  return update!;
}

describe("data job, normal run", () => {
  it("saves a reading with bookie odds and the Polymarket price", async () => {
    const summary = await runDataJob(now);
    expect(summary.readingsSaved).toBe(1);
    const [reading] = writes(calls, "readings", "upsert") as { kind: string; poly_status: string; usable: boolean }[];
    expect(reading).toMatchObject({ kind: "pre_kickoff", poly_status: "ok", usable: true });
    expect(finishedRun().readings_saved).toBe(1);
  });
});

describe("data job, when things go wrong", () => {
  it("Tatum down: saves no half reading and tries again next run", async () => {
    services.findPolymarketMatch.mockRejectedValue(new Error("Tatum 503 Service Unavailable"));
    const summary = await runDataJob(now);
    expect(writes(calls, "readings", "upsert")).toEqual([]);
    expect(summary.log.join("\n")).toContain("Tatum error, will try next run");
    expect(services.queueMemories).toHaveBeenCalled(); // later steps still run
    finishedRun();
  });

  it("Odds API limit hit: skips that league, the run still finishes", async () => {
    services.fetchLeagueOdds.mockRejectedValue(new Error("The Odds API 429: usage quota reached"));
    const summary = await runDataJob(now);
    expect(writes(calls, "readings", "upsert")).toEqual([]);
    expect(summary.log.join("\n")).toMatch(/PL: skipped this run .*429/);
    expect(services.getAppBalance).toHaveBeenCalled(); // stamping still runs
    finishedRun();
  });

  it("low on Odds API credits: pre-kickoff readings pause, so no credit is spent", async () => {
    extra = (c) =>
      c.table === "job_runs" && c.op === "select" ? { data: { started_at: "2026-10-30T20:17:00Z", odds_credits_remaining: 40 } } : undefined;
    const summary = await runDataJob(now);
    expect(services.fetchLeagueOdds).not.toHaveBeenCalled();
    expect(summary.log.join("\n")).toContain("Low on Odds API credits (40 left)");
  });

  it("no Polymarket market: saves the bookie odds alone, marked not for scoring, never guessed", async () => {
    services.findPolymarketMatch.mockResolvedValue(null);
    await runDataJob(now);
    expect(writes(calls, "matches", "update")).toContainEqual({ polymarket_status: "not_found" });
    const [reading] = writes(calls, "readings", "upsert") as { poly_status: string; usable: boolean; poly_home: number | null }[];
    expect(reading).toMatchObject({ poly_status: "not_found", usable: false, poly_home: null });
  });

  it("Sui transaction fails: the readings are marked failed and retried next run", async () => {
    extra = (c) => (c.table === "readings" && c.op === "select" && has(c, "in", "sui_status") ? { data: [{ id: "r1", content_hash: "ab".repeat(32) }] } : undefined);
    services.stampHashes.mockRejectedValue(new Error("Sui rejected the stamp transaction"));
    const summary = await runDataJob(now);
    expect(writes(calls, "readings", "update")).toContainEqual({ sui_status: "failed" });
    expect(summary.log.join("\n")).toContain("Sui stamp failed for 1 reading(s), will retry next run");
  });

  it("wallet low: warns the owner in the log and keeps going", async () => {
    services.getAppBalance.mockResolvedValue({ address: "0xapp", mist: 100_000_000n });
    const summary = await runDataJob(now);
    expect(summary.log.join("\n")).toMatch(/WARNING: app wallet 0xapp is low on SUI \(0\.1000 SUI left\)/);
    expect(summary.readingsSaved).toBe(1);
  });

  it("Walrus fails: the readings and stamps from this run are kept, memories wait for the next run", async () => {
    services.queueMemories.mockRejectedValue(new Error("relayer timeout"));
    const summary = await runDataJob(now);
    expect(summary.log.join("\n")).toContain("Walrus step skipped this run (relayer timeout)");
    expect(finishedRun().readings_saved).toBe(1);
  });

  it("match postponed: noted on the match, never graded", async () => {
    const played = { id: "m9", league_code: "PL", home_team: "Arsenal", away_team: "Liverpool", kickoff_at: "2026-10-29T19:45:00Z", result_status: null };
    extra = (c) => (c.table === "matches" && c.op === "select" && has(c, "is", "graded_at") ? { data: [played] } : undefined);
    services.fetchLeagueResults.mockResolvedValue([
      {
        id: 501,
        utcDate: played.kickoff_at,
        status: "POSTPONED",
        homeTeam: { name: "Arsenal FC", shortName: "Arsenal" },
        awayTeam: { name: "Liverpool FC", shortName: "Liverpool" },
        score: { fullTime: { home: null, away: null } },
      },
    ]);
    const summary = await runDataJob(now);
    expect(writes(calls, "matches", "update")).toContainEqual({ result_status: "postponed", football_data_id: 501 });
    expect((writes(calls, "readings", "update") as { graded_at?: string }[]).some((u) => u.graded_at)).toBe(false);
    expect(summary.log.join("\n")).toContain("PL Arsenal v Liverpool: postponed, not graded");
  });

  it("team names that don't match: no result is guessed", async () => {
    const played = { id: "m9", league_code: "PL", home_team: "Arsenal", away_team: "Liverpool", kickoff_at: "2026-10-29T19:45:00Z", result_status: null };
    extra = (c) => (c.table === "matches" && c.op === "select" && has(c, "is", "graded_at") ? { data: [played] } : undefined);
    services.fetchLeagueResults.mockResolvedValue([
      {
        id: 502,
        utcDate: played.kickoff_at,
        status: "FINISHED",
        homeTeam: { name: "Aston Villa FC", shortName: "Aston Villa" },
        awayTeam: { name: "Leeds United FC", shortName: "Leeds" },
        score: { duration: "REGULAR", fullTime: { home: 2, away: 1 } },
      },
    ]);
    const summary = await runDataJob(now);
    expect((writes(calls, "matches", "update") as { result?: string }[]).some((u) => u.result)).toBe(false);
    expect(summary.log.join("\n")).toContain("PL Arsenal v Liverpool: no result found on football-data.org yet");
  });

  it("results service down: grading waits, the run still finishes", async () => {
    const played = { id: "m9", league_code: "PL", home_team: "Arsenal", away_team: "Liverpool", kickoff_at: "2026-10-29T19:45:00Z", result_status: null };
    extra = (c) => (c.table === "matches" && c.op === "select" && has(c, "is", "graded_at") ? { data: [played] } : undefined);
    services.fetchLeagueResults.mockRejectedValue(new Error("football-data.org 429"));
    const summary = await runDataJob(now);
    expect(summary.log.join("\n")).toContain("PL: grading skipped this run (football-data.org 429)");
    expect(services.queueMemories).toHaveBeenCalled();
    finishedRun();
  });
});
