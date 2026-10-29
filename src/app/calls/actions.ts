"use server";

import { redirect } from "next/navigation";
import { isCall } from "@/lib/call-result";
import { makeCall, retryCallStamp } from "@/lib/calls";
import { getCurrentUser } from "@/lib/supabase/server";

/** `stamp` is set once Sui has confirmed the call. Null means it was saved but the stamp failed. */
export type CallState = { error?: string; stamp?: { digest: string; stampedAt: string } | null };

// No page refresh here: the answer goes back as soon as Sui confirms, and the page refreshes itself after.
export async function makeCallAction(matchId: string, pick: string): Promise<CallState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // a call always needs a signed-in user, whatever the browser sends
  if (!isCall(pick)) return { error: "Choose a team to win, or a draw." };
  const result = await makeCall(user.id, matchId, pick);
  return result.ok ? { stamp: result.stamp } : { error: result.error };
}

export async function retryStampAction(matchId: string): Promise<CallState> {
  if (!(await getCurrentUser())) redirect("/login");
  const result = await retryCallStamp(matchId);
  return result.ok ? { stamp: result.stamp } : { error: result.error };
}
