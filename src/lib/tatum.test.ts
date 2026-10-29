import { describe, expect, it, vi } from "vitest";
import { isNetworkError, withFreshConnection } from "./tatum";

describe("isNetworkError", () => {
  it("retries a dropped or stuck connection", () => {
    expect(isNetworkError(new Error("read ECONNRESET"))).toBe(true);
    expect(isNetworkError(Object.assign(new Error("14 UNAVAILABLE: Connection dropped"), { code: 14 }))).toBe(true);
    expect(isNetworkError(new Error("Deadline exceeded after 8.001s"))).toBe(true);
    expect(isNetworkError({ code: "DEADLINE_EXCEEDED", message: "" })).toBe(true);
  });

  it("doesn't retry Sui saying no", () => {
    expect(isNetworkError(new Error("InsufficientGas"))).toBe(false);
    expect(isNetworkError(new Error("SUI_APP_PRIVATE_KEY is missing"))).toBe(false);
  });
});

describe("withFreshConnection", () => {
  process.env.TATUM_API_KEY ??= "test-key"; // building a client doesn't connect, so no real key is needed
  vi.spyOn(console, "warn").mockImplementation(() => {});

  it("tries again on a new connection after ECONNRESET", async () => {
    const clients: unknown[] = [];
    const result = await withFreshConnection(async (client) => {
      clients.push(client);
      if (clients.length === 1) throw new Error("read ECONNRESET");
      return "stamped";
    });
    expect(result).toBe("stamped");
    expect(clients).toHaveLength(2);
    expect(clients[1]).not.toBe(clients[0]);
  });

  it("gives up after 3 tries", async () => {
    let tries = 0;
    await expect(
      withFreshConnection(async () => {
        tries++;
        throw new Error("read ECONNRESET");
      }),
    ).rejects.toThrow("ECONNRESET");
    expect(tries).toBe(3);
  });

  it("doesn't retry other errors", async () => {
    let tries = 0;
    await expect(
      withFreshConnection(async () => {
        tries++;
        throw new Error("InsufficientGas");
      }),
    ).rejects.toThrow("InsufficientGas");
    expect(tries).toBe(1);
  });
});
