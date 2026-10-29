import { describe, expect, it } from "vitest";
import { fanId } from "./fan-id";

describe("fanId", () => {
  it("is 12 hex characters, the same every time, and different per user", () => {
    const a = fanId("e1ce184d-0000-4000-8000-000000000001");
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(fanId("e1ce184d-0000-4000-8000-000000000001")).toBe(a);
    expect(fanId("e1ce184d-0000-4000-8000-000000000002")).not.toBe(a);
  });
});
