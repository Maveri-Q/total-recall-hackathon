import { describe, expect, it } from "vitest";
import { movementLine } from "./movement";

const t = (home: number, draw: number, away: number) => ({ home, draw, away });

describe("movementLine", () => {
  it("names the source that moved, and says the other stayed put", () => {
    const first = { bookies: t(0.55, 0.25, 0.2), poly: t(0.52, 0.26, 0.22) };
    const latest = { bookies: t(0.55, 0.25, 0.2), poly: t(0.6, 0.22, 0.18) };
    expect(movementLine(first, latest, "Arsenal", "Spurs")).toBe(
      "Polymarket moved Arsenal from 52% to 60% since our first check. Bookies stayed at 55%.",
    );
  });

  it("both moved: the bigger mover first", () => {
    // Real numbers, Chelsea v Man United: Chelsea down 4.8 points on Polymarket, 4.6 on the bookies.
    const first = { bookies: t(0.536, 0.244, 0.22), poly: t(0.535, 0.245, 0.22) };
    const latest = { bookies: t(0.49, 0.26, 0.25), poly: t(0.487, 0.262, 0.251) };
    expect(movementLine(first, latest, "Chelsea", "Man United")).toBe(
      "Polymarket moved Chelsea from 54% to 49% since our first check. Bookies did the same, 54% to 49%.",
    );
  });

  it("talks about the draw or the away side when that's what moved most", () => {
    const first = { bookies: t(0.4, 0.3, 0.3), poly: t(0.4, 0.3, 0.3) };
    const latest = { bookies: t(0.39, 0.27, 0.34), poly: t(0.4, 0.3, 0.3) };
    expect(movementLine(first, latest, "Lille", "Lens")).toBe("Bookies moved Lens from 30% to 34% since our first check. Polymarket stayed at 30%.");
    const drawLatest = { bookies: t(0.38, 0.33, 0.29), poly: t(0.4, 0.3, 0.3) };
    expect(movementLine(first, drawLatest, "Lille", "Lens")).toBe("Bookies moved the draw from 30% to 33% since our first check. Polymarket stayed at 30%.");
  });

  it("both moved, opposite ways: each gets its own sentence", () => {
    const first = { bookies: t(0.5, 0.25, 0.25), poly: t(0.5, 0.25, 0.25) };
    const latest = { bookies: t(0.47, 0.27, 0.26), poly: t(0.54, 0.23, 0.23) };
    expect(movementLine(first, latest, "Roma", "Cagliari")).toBe(
      "Polymarket moved Roma from 50% to 54% since our first check. Bookies moved Roma from 50% to 47%.",
    );
  });

  it("says when a source only moved a little", () => {
    const first = { bookies: t(0.5, 0.25, 0.25), poly: t(0.5, 0.25, 0.25) };
    const latest = { bookies: t(0.512, 0.244, 0.244), poly: t(0.53, 0.235, 0.235) };
    expect(movementLine(first, latest, "Roma", "Cagliari")).toBe(
      "Polymarket moved Roma from 50% to 53% since our first check. Bookies hardly moved, 50% to 51%.",
    );
  });

  it("under 2 points everywhere: no big change", () => {
    const first = { bookies: t(0.5, 0.25, 0.25), poly: t(0.5, 0.25, 0.25) };
    const latest = { bookies: t(0.515, 0.245, 0.24), poly: t(0.49, 0.26, 0.25) };
    expect(movementLine(first, latest, "Roma", "Cagliari")).toBe("No big change since our first check.");
  });
});
