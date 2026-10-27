// Supabase client with the secret key, for the data job only. It skips row level security,
// so it must never be imported by anything that runs in the browser.
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
