// Where to send someone after they sign in. Only paths on this site, so a link can't send them elsewhere.
export const NEXT_COOKIE = "od_next";

export function safeNext(value: unknown, fallback = "/calls"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}
