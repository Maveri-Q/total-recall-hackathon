// The greeting by the profile button: "Hi, Maverick" on someone's first day, "Welcome back, Maverick" after.
// First name only, from their Google profile. Email sign-ups have no name, so they get the greeting alone:
// we never show an email address here.

/** Under this age an account counts as new. */
const NEW_FOR_MS = 24 * 3600_000;

/** The first word of the name their sign-in gave us, if any. */
export function firstName(meta: Record<string, unknown> | null | undefined): string | null {
  for (const key of ["given_name", "full_name", "name"]) {
    const v = meta?.[key];
    if (typeof v === "string" && v.trim()) return v.trim().split(/\s+/)[0];
  }
  return null;
}

export function greeting(name: string | null, createdAt: string | null, now: Date): string {
  const isNew = createdAt !== null && now.getTime() - Date.parse(createdAt) < NEW_FOR_MS;
  const hello = isNew ? "Hi" : "Welcome back";
  return name ? `${hello}, ${name}` : hello;
}
