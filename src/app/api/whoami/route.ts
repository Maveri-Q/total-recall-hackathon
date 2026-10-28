// Temporary check for a live login bug: says whether the server sees a login cookie and can read it.
// Shows cookie names and error messages only, never cookie values or tokens.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const names = (await cookies()).getAll().map((c) => c.name);
  const { data, error } = await (await createClient()).auth.getClaims();
  return NextResponse.json(
    {
      loginCookies: names.filter((n) => n.startsWith("sb-")),
      loggedIn: Boolean(data?.claims?.sub),
      error: error ? `${error.name}: ${error.message}` : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
