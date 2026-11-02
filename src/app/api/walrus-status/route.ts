// GET /api/walrus-status?digest=<Sui transaction>: has the signed-in user's call with this stamp been saved on Walrus yet?
// A small check the call card asks every 2 seconds after stamping, instead of reloading the whole page.
// Only the user's own calls can be checked (row level security on prediction_versions).
import { connection, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  await connection();
  const digest = request.nextUrl.searchParams.get("digest") ?? "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(digest)) return NextResponse.json({ saved: false }, { status: 400, headers: NO_STORE });

  const { data: version } = await (await createClient()).from("prediction_versions").select("id").eq("sui_digest", digest).maybeSingle();
  if (!version) return NextResponse.json({ saved: false }, { status: 404, headers: NO_STORE });

  const { data: memory } = await createAdminClient().from("memories").select("status").eq("kind", "call").eq("ref_key", version.id).maybeSingle();
  return NextResponse.json({ saved: memory?.status === "saved" }, { headers: NO_STORE });
}
