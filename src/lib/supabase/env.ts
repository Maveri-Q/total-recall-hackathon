// Public Supabase settings. The secret key is never read here.
// NEXT_PUBLIC_ values must be read with literal names so Next.js can inline them.

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local.");
  return value;
}

export function supabasePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. Add it to .env.local.");
  return value;
}
