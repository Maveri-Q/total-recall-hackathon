import { describe, expect, it } from "vitest";
import { clock, dayLabel, zoneLabel } from "./local-time";

const lagos = "Africa/Lagos"; // UTC+1, no daylight saving
const kickoff = new Date("2026-10-31T16:30:00Z");

describe("local time", () => {
  it("shows the viewer's own clock time, not UTC", () => {
    expect(clock(kickoff, lagos)).toBe("5:30pm");
    expect(clock(new Date("2026-10-31T09:05:00Z"), lagos)).toBe("10:05am");
    expect(clock(kickoff, "UTC")).toBe("4:30pm");
  });

  it("names the zone", () => {
    expect(zoneLabel(kickoff, lagos, "en-NG")).toMatch(/WAT|GMT\+1/);
  });

  it("says Today, Tomorrow or the date, by the viewer's own day", () => {
    const now = new Date("2026-10-30T23:30:00Z"); // already 31 Oct in Lagos
    expect(dayLabel(kickoff, now, lagos)).toBe("Today");
    expect(dayLabel(kickoff, now, "UTC")).toBe("Tomorrow");
    expect(dayLabel(new Date("2026-11-03T19:00:00Z"), now, lagos)).toBe("Tue 3 Nov");
  });
});
