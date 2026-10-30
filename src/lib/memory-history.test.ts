import { describe, expect, it } from "vitest";
import { leader, recordSteps, type RecordMemory } from "./memory-history";

// The real Serie A memories saved on Walrus, 28 to 29 Oct 2026.
const saved: RecordMemory[] = [
  { ref_key: "SA:6", summary: "Serie A: Bookies 1, Polymarket 5, from 6 games.", saved_at: "2026-10-28T19:37:00Z", blob_id: "b6" },
  { ref_key: "SA:3", summary: "Serie A: Bookies 0, Polymarket 3, from 3 games.", saved_at: "2026-10-28T03:36:00Z", blob_id: "b3" },
  { ref_key: "ALL:3", summary: "All leagues: Bookies 0, Polymarket 3, from 3 games.", saved_at: "2026-10-28T03:36:00Z", blob_id: "a3" },
  { ref_key: "SA:10", summary: "Serie A: Bookies 3, Polymarket 7, from 10 games.", saved_at: "2026-10-29T22:18:00Z", blob_id: "b10" },
];

describe("recordSteps", () => {
  it("lists one league's saved records, fewest games first", () => {
    expect(recordSteps(saved, "SA").map((s) => [s.games, s.bookies, s.polymarket])).toEqual([
      [3, 0, 3],
      [6, 1, 5],
      [10, 3, 7],
    ]);
    expect(recordSteps(saved, "ALL")).toHaveLength(1);
  });

  it("keeps each step's Walrus blob and save time", () => {
    expect(recordSteps(saved, "SA")[0]).toMatchObject({ blobId: "b3", savedAt: "2026-10-28T03:36:00Z" });
  });

  it("leaves out memories not saved yet, or whose summary doesn't match their key", () => {
    const rows: RecordMemory[] = [
      { ref_key: "SA:12", summary: "Serie A: Bookies 4, Polymarket 8, from 12 games.", saved_at: null, blob_id: null },
      { ref_key: "SA:11", summary: "Serie A: Bookies 4, Polymarket 7, from 12 games.", saved_at: "2026-10-31T10:00:00Z", blob_id: "x" },
      { ref_key: "SAX:3", summary: "Other: Bookies 1, Polymarket 2, from 3 games.", saved_at: "2026-10-31T10:00:00Z", blob_id: "y" },
    ];
    expect(recordSteps(rows, "SA")).toEqual([]);
  });

  it("reads a one-game record", () => {
    const one = [{ ref_key: "PL:1", summary: "Premier League: Bookies 1, Polymarket 0, from 1 game.", saved_at: "2026-10-31T15:00:00Z", blob_id: "p1" }];
    expect(recordSteps(one, "PL")).toMatchObject([{ games: 1, bookies: 1, polymarket: 0 }]);
  });
});

describe("leader", () => {
  it("says who was ahead", () => {
    expect(leader({ bookies: 3, polymarket: 7 })).toBe("polymarket");
    expect(leader({ bookies: 2, polymarket: 1 })).toBe("bookies");
    expect(leader({ bookies: 2, polymarket: 2 })).toBe("level");
  });
});
