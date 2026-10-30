// GET /api/check-stamp?digest=<Sui transaction>&ref=<record id>: reads the stamp back from Sui through Tatum and
// checks it against the saved record. Says only whether it matches and when it was stamped, never what a call picked.
import { connection, NextResponse, type NextRequest } from "next/server";
import { checkStamp } from "@/lib/check-stamp";

export async function GET(request: NextRequest) {
  await connection();
  const digest = request.nextUrl.searchParams.get("digest") ?? "";
  const ref = request.nextUrl.searchParams.get("ref") ?? "";
  try {
    return NextResponse.json(await checkStamp(digest, ref), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("check stamp", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "Couldn't reach Sui right now. Try again in a minute." }, { status: 503 });
  }
}
