// Google sends people back here after they sign in. Supabase swaps the one-time code for a
// login session (saved in cookies, so the browser stays logged in), then we go where they were heading:
// usually the game they tapped a call on, otherwise their calls.
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { NEXT_COOKIE, safeNext } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const jar = await cookies();
  const next = safeNext(jar.get(NEXT_COOKIE)?.value);
  jar.delete(NEXT_COOKIE);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("Google sign-in", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=google`);
}
