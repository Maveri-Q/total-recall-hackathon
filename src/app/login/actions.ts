"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

function authErrorText(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match.";
    case "user_already_exists":
      return "There's already an account with this email. Log in instead.";
    case "weak_password":
      return "Pick a longer password (at least 8 characters).";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many tries in a short time. Wait a few minutes and try again.";
    default:
      return fallback;
  }
}

export async function authenticate(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { error: "Enter your email address.", email };
  if (password.length < 8) return { error: "Passwords are at least 8 characters.", email };

  const supabase = await createClient();

  if (mode === "login") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: authErrorText(error.code, "Couldn't log in. Try again."), email };
    redirect("/picks");
  }

  // No confirmation email: "Confirm email" is turned off in Supabase, so sign-up logs the user straight in.
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: authErrorText(error.code, "Couldn't create the account. Try again."), email };
  if (data.session) redirect("/picks");
  return {
    error: "Account created, but Supabase still wants an email confirmation. Turn off \"Confirm email\" in Supabase, then log in.",
    email,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Starts Google sign-in. Google sends the user back to /auth/callback. */
export async function signInWithGoogle() {
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) {
    console.error("Google sign-in", error?.message);
    redirect("/login?error=google");
  }
  redirect(data.url);
}
