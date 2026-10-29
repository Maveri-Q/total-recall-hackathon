import { describe, expect, it } from "vitest";
import { safeNext } from "./next-path";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/?call=abc.home")).toBe("/?call=abc.home");
  });
  it("refuses other sites and odd values", () => {
    expect(safeNext("https://evil.example")).toBe("/calls");
    expect(safeNext("//evil.example")).toBe("/calls");
    expect(safeNext("/\\evil.example")).toBe("/calls");
    expect(safeNext(undefined)).toBe("/calls");
  });
});
