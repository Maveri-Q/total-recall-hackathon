import { describe, expect, it } from "vitest";
import { firstName, greeting } from "./greeting";

const now = new Date("2026-10-30T12:00:00Z");

describe("greeting", () => {
  it("says hi on the first day and welcome back after", () => {
    expect(greeting("Maverick", "2026-10-30T09:00:00Z", now)).toBe("Hi, Maverick");
    expect(greeting("Maverick", "2026-10-28T09:00:00Z", now)).toBe("Welcome back, Maverick");
  });

  it("works without a name or a sign-up date", () => {
    expect(greeting(null, "2026-10-30T09:00:00Z", now)).toBe("Hi");
    expect(greeting(null, null, now)).toBe("Welcome back");
  });
});

describe("firstName", () => {
  it("takes the first word of the Google name", () => {
    expect(firstName({ full_name: "Maverick Obi", name: "Maverick Obi" })).toBe("Maverick");
    expect(firstName({ given_name: "Ada", full_name: "Ada Lovelace" })).toBe("Ada");
  });

  it("has nothing for email sign-ups", () => {
    expect(firstName({ email: "fan@example.com" })).toBeNull();
    expect(firstName({ full_name: "   " })).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});
