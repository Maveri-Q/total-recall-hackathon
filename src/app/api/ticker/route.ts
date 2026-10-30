// The ticker's lines as JSON, so an open Matches page can refresh its ticker without reloading.
// Public data only (the same games and results anyone can see on Matches).
import { connection, NextResponse } from "next/server";
import { getTicker } from "@/lib/ticker-data";

export async function GET() {
  await connection();
  try {
    return NextResponse.json(await getTicker(new Date()), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("ticker", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't load the ticker" }, { status: 503 });
  }
}
