"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { isCall } from "@/lib/call-result";
import { makeCall } from "@/lib/calls";
import { getCurrentUser } from "@/lib/supabase/server";

export type CallState = { error?: string };

export async function makeCallAction(matchId: string, pick: string): Promise<CallState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isCall(pick)) return { error: "Choose a team to win, or a draw." };
  const result = await makeCall(user.id, matchId, pick);
  if (!result.ok) return { error: result.error };
  refresh();
  return {};
}
