// The anonymous id a user's calls carry on Walrus. A hash of their user id: it lets "Your memory" find
// their own calls, but says nothing about who they are. Never a name or email.
// The "oddsight-fan:" prefix is from the app's first name. Keep it: changing it would give every user a new id
// and cut them off from the calls already saved on Walrus.
import { createHash } from "node:crypto";

export function fanId(userId: string): string {
  return createHash("sha256").update(`oddsight-fan:${userId}`).digest("hex").slice(0, 12);
}
