import { describe, expect, it } from "vitest";
import { callLabel, callOutcome, callRecord, isCall } from "./call-result";

describe("callLabel", () => {
  it("names the buttons after the teams", () => {
    expect(callLabel("home", "Roma", "Cagliari")).toBe("Roma win");
    expect(callLabel("draw", "Roma", "Cagliari")).toBe("Draw");
    expect(callLabel("away", "Roma", "Cagliari")).toBe("Cagliari win");
  });
});

describe("isCall", () => {
  it("only accepts home, draw or away", () => {
    expect(isCall("draw")).toBe(true);
    expect(isCall("win")).toBe(false);
    expect(isCall(undefined)).toBe(false);
  });
});

describe("callOutcome", () => {
  const kickoff = "2026-10-27T19:45:00Z";
  const before = new Date("2026-10-27T19:00:00Z");
  const after = new Date("2026-10-28T09:00:00Z");
  const finished = { result: "home" as const, result_status: "finished" };

  it("is open before kickoff, even if a result somehow exists", () => {
    expect(callOutcome("home", kickoff, finished, before)).toBe("open");
  });

  it("waits for full time once the game has started", () => {
    expect(callOutcome("home", kickoff, { result: null, result_status: null }, after)).toBe("waiting");
    expect(callOutcome("home", kickoff, null, after)).toBe("waiting");
  });

  it("says whether the call was right", () => {
    expect(callOutcome("home", kickoff, finished, after)).toBe("called_it");
    expect(callOutcome("draw", kickoff, finished, after)).toBe("not_this_time");
  });

  it("handles postponed and cancelled games", () => {
    expect(callOutcome("home", kickoff, { result: null, result_status: "postponed" }, after)).toBe("postponed");
    expect(callOutcome("home", kickoff, { result: null, result_status: "cancelled" }, after)).toBe("cancelled");
  });
});

describe("callRecord", () => {
  it("counts only settled calls", () => {
    expect(callRecord(["called_it", "not_this_time", "called_it", "open", "waiting", "postponed"])).toEqual({
      right: 2,
      settled: 3,
    });
  });
});
