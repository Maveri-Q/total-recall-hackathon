// Fixtures and team names for one league, for the new-pick form.
import { NextResponse, type NextRequest } from "next/server";
import { getTeams, getUpcomingFixtures, hasFootballDataKey } from "@/lib/football-data";
import { leagueByCode } from "@/lib/leagues";
import { getCurrentUser } from "@/lib/supabase/server";

export type FootballResponse = {
  fixtures: Awaited<ReturnType<typeof getUpcomingFixtures>>;
  teams: Awaited<ReturnType<typeof getTeams>>;
};

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Log in first." }, { status: 401 });

  const code = request.nextUrl.searchParams.get("league") ?? "";
  if (!leagueByCode(code)) return NextResponse.json({ error: "Unknown league." }, { status: 400 });

  if (!hasFootballDataKey()) {
    const off = { ok: false as const, error: "Fixture list isn't set up yet." };
    return NextResponse.json({ fixtures: off, teams: off } satisfies FootballResponse);
  }

  const [fixtures, teams] = await Promise.all([getUpcomingFixtures(code, new Date()), getTeams(code)]);
  return NextResponse.json({ fixtures, teams } satisfies FootballResponse);
}
