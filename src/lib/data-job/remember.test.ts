// Walrus Memory when it fails: a memory that can't be sent stays queued and is tried again next run.
// Walrus and the database are stand-ins, so no keys are needed.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, writes, type DbCall } from "./test-db";

const walrus = vi.hoisted(() => ({ sendMemories: vi.fn(), checkMemories: vi.fn(), waitForMemories: vi.fn() }));
vi.mock("../walrus", () => ({
  MAX_MEMORIES_PER_CALL: 20,
  walrusConfigured: () => true,
  sendMemories: walrus.sendMemories,
  checkMemories: walrus.checkMemories,
  waitForMemories: walrus.waitForMemories,
}));

const { RETRY_FAILED_AFTER_MS, sendPendingMemories } = await import("./remember");

/** The "re-queue failed memories" update runs every time; these helpers leave it out of the other checks. */
const REVIVE = { status: "pending", attempts: 0, error: null };
const otherUpdates = () => writes(calls, "memories", "update").filter((u) => JSON.stringify(u) !== JSON.stringify(REVIVE));

const queued = [{ id: "mem1", attempts: 0, namespace: "results", text: "Graded match: Fiorentina 2-2 Atalanta BC" }];
let calls: DbCall[];
let db: ReturnType<typeof fakeDb>["client"];

beforeEach(() => {
  vi.clearAllMocks();
  const fake = fakeDb((c) => {
    if (c.table === "memories" && c.op === "select") {
      const status = c.filters.find(([f, args]) => f === "eq" && args[0] === "status")?.[1][1];
      return { data: status === "pending" ? queued : [] };
    }
    return undefined;
  });
  db = fake.client;
  calls = fake.calls;
});

describe("sending memories to Walrus", () => {
  it("relayer down: the memory stays queued, nothing is marked sent", async () => {
    walrus.sendMemories.mockRejectedValue(new Error("relayer 502"));
    const log: string[] = [];
    await sendPendingMemories(db as never, log);
    expect(otherUpdates()).toEqual([]);
    expect(log.join("\n")).toContain("Couldn't send 1 memory(ies) to Walrus, will retry (relayer 502)");
  });

  it("Walrus save fails after sending: the memory goes back in the queue for the next run", async () => {
    walrus.sendMemories.mockResolvedValue(["job1"]);
    walrus.waitForMemories.mockResolvedValue([{ jobId: "job1", status: "failed", blobId: null, error: "storage node timeout" }]);
    const log: string[] = [];
    await sendPendingMemories(db as never, log);
    expect(otherUpdates()).toContainEqual({ status: "pending", job_id: null, error: "storage node timeout" });
    expect(log.join("\n")).toContain("Walrus memory failed, will retry (storage node timeout)");
  });

  it("relayer up: the memory is marked sent with its job id, then saved with its blob", async () => {
    walrus.sendMemories.mockResolvedValue(["job1"]);
    walrus.waitForMemories.mockResolvedValue([{ jobId: "job1", status: "done", blobId: "BLOB1", error: null }]);
    const log: string[] = [];
    await sendPendingMemories(db as never, log);
    const updates = otherUpdates() as { status?: string; job_id?: string; blob_id?: string }[];
    expect(updates[0]).toMatchObject({ status: "sent", job_id: "job1", attempts: 1 });
    expect(updates.some((u) => u.blob_id === "BLOB1")).toBe(true);
  });

  it("after an outage, memories that failed every try go back in the queue 2 hours after their last try", async () => {
    walrus.sendMemories.mockRejectedValue(new Error("relayer 502"));
    const now = new Date("2026-10-31T09:17:00Z");
    await sendPendingMemories(db as never, [], now);
    const revive = calls.find((c) => c.table === "memories" && c.op === "update" && JSON.stringify(c.payload) === JSON.stringify(REVIVE));
    expect(revive?.filters).toContainEqual(["eq", ["status", "failed"]]);
    expect(revive?.filters).toContainEqual(["lt", ["sent_at", new Date(now.getTime() - RETRY_FAILED_AFTER_MS).toISOString()]]);
  });
});
