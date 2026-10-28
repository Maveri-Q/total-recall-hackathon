// Google sends people back here after they sign in. Supabase swaps the one-time code for a
// login session (saved in cookies, so the browser stays logged in), then we go to their picks.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/picks`);
    console.error("Google sign-in", error.message);
  }
  return NextResponse.redirect(`${origin}/login?error=google`);
}
