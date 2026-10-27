"use client";

import { useActionState, useState } from "react";
import { LEAGUES, leagueByName } from "@/lib/leagues";
import type { FootballResponse } from "../../api/football/route";
import { createPredictionAction, type FormState } from "../actions";
import { FieldError, PickFields } from "../pick-fields";

type Fixture = { id: number; kickoffAt: string; homeTeam: string; awayTeam: string };
type LeagueData =
  | { status: "loading" }
  | { status: "ready"; fixtures: Fixture[] | null; teams: string[]; note: string | null };

const LOAD_FAILED = "We couldn't load the fixture list just now. Type the match in below.";
const NO_FIXTURE_LIST: LeagueData = {
  status: "ready",
  fixtures: null,
  teams: [],
  note: "We don't have a fixture list for this league. Type the match in below.",
};

/** Date "2026-11-07" + time "16:00" in the user's own timezone -> UTC ISO string for the server. */
function localToIso(date: string, time: string): string {
  if (!date || !time) return "";
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function fixtureWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NewPredictionForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createPredictionAction, {});
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};

  const [league, setLeague] = useState(values.league ?? "");
  const [mode, setMode] = useState<"fixture" | "manual">(values.matchMode === "manual" ? "manual" : "fixture");
  const [byCode, setByCode] = useState<Record<string, LeagueData>>({});
  const [search, setSearch] = useState("");
  const [fixtureId, setFixtureId] = useState(values.fixtureId ?? "");
  const [homeTeam, setHomeTeam] = useState(values.homeTeam ?? "");
  const [awayTeam, setAwayTeam] = useState(values.awayTeam ?? "");
  const [date, setDate] = useState(values.kickoffDate ?? "");
  const [time, setTime] = useState(values.kickoffTime ?? "");

  const code = leagueByName(league)?.code ?? null;
  const data: LeagueData | null = !league ? null : code ? (byCode[code] ?? null) : NO_FIXTURE_LIST;

  function chooseLeague(name: string) {
    setLeague(name);
    setFixtureId("");
    setSearch("");
    setMode("fixture");

    const c = leagueByName(name)?.code;
    const existing = c ? byCode[c] : undefined;
    // Load each league once. A failed load is tried again next time the league is chosen.
    if (!c || existing?.status === "loading" || (existing?.status === "ready" && existing.fixtures)) return;
    setByCode((prev) => ({ ...prev, [c]: { status: "loading" } }));
    fetch(`/api/football?league=${c}`)
      .then((res) => res.json() as Promise<FootballResponse>)
      .then((body) => {
        const fixtures = body.fixtures?.ok ? body.fixtures.data : null;
        const teams = body.teams?.ok ? body.teams.data : [];
        setByCode((prev) => ({
          ...prev,
          [c]: { status: "ready", fixtures, teams, note: fixtures ? null : LOAD_FAILED },
        }));
      })
      .catch(() => {
        setByCode((prev) => ({ ...prev, [c]: { status: "ready", fixtures: null, teams: [], note: LOAD_FAILED } }));
      });
  }

  const fixtures = data?.status === "ready" ? data.fixtures : null;
  const effectiveMode = fixtures ? mode : "manual";
  const q = search.trim().toLowerCase();
  const shown = (fixtures ?? []).filter(
    (f) => !q || f.homeTeam.toLowerCase().includes(q) || f.awayTeam.toLowerCase().includes(q),
  );
  const chosen = fixtures?.find((f) => String(f.id) === fixtureId);
  const pickHome = effectiveMode === "fixture" ? (chosen?.homeTeam ?? "") : homeTeam;
  const pickAway = effectiveMode === "fixture" ? (chosen?.awayTeam ?? "") : awayTeam;
  const teams = data?.status === "ready" ? data.teams : [];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="matchMode" value={effectiveMode} />

      <label className="flex flex-col gap-1">
        <span className="font-bold">League</span>
        <select
          name="league"
          required
          value={league}
          onChange={(e) => chooseLeague(e.target.value)}
          className="border p-2"
        >
          <option value="" disabled>
            Choose a league
          </option>
          {LEAGUES.map((l) => (
            <option key={l.name}>{l.name}</option>
          ))}
        </select>
        <FieldError text={errors.league} />
      </label>

      {league && data?.status === "loading" && <p>Loading this league&apos;s fixtures…</p>}
      {data?.status === "ready" && data.note && <p>{data.note}</p>}

      {league && effectiveMode === "fixture" && fixtures && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-bold">Match</legend>
          <input type="hidden" name="fixtureId" value={fixtureId} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by team, e.g. Arsenal"
            className="border p-2"
          />
          {fixtures.length === 0 && <p>No matches in this league in the next two weeks.</p>}
          {fixtures.length > 0 && shown.length === 0 && <p>No match with that team in the next two weeks.</p>}
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {shown.map((f) => (
              <label key={f.id} className="flex items-center gap-2 border p-2">
                <input
                  type="radio"
                  name="fixtureChoice"
                  checked={fixtureId === String(f.id)}
                  onChange={() => setFixtureId(String(f.id))}
                />
                <span>
                  <strong>
                    {f.homeTeam} vs {f.awayTeam}
                  </strong>
                  <br />
                  <span className="text-sm">{fixtureWhen(f.kickoffAt)}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError text={errors.externalMatchId} />
          <button type="button" onClick={() => setMode("manual")} className="self-start text-sm underline">
            Match not listed? Type it in yourself
          </button>
        </fieldset>
      )}

      {league && effectiveMode === "manual" && data?.status === "ready" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="font-bold">Match</legend>
          {teams.length > 0 && (
            <datalist id="league-teams">
              {teams.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          )}
          <label className="flex flex-col gap-1">
            Home team
            <input
              name="homeTeam"
              list="league-teams"
              required
              maxLength={60}
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              placeholder={teams.length > 0 ? "Start typing to search" : ""}
              className="border p-2"
            />
            <FieldError text={errors.homeTeam} />
          </label>
          <label className="flex flex-col gap-1">
            Away team
            <input
              name="awayTeam"
              list="league-teams"
              required
              maxLength={60}
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              placeholder={teams.length > 0 ? "Start typing to search" : ""}
              className="border p-2"
            />
            <FieldError text={errors.awayTeam} />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              Kickoff date
              <input
                name="kickoffDate"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2"
              />
            </label>
            <label className="flex flex-col gap-1">
              Kickoff time (your time)
              <input
                name="kickoffTime"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="border p-2"
              />
            </label>
          </div>
          <input type="hidden" name="kickoffAt" value={localToIso(date, time)} />
          <FieldError text={errors.kickoffAt} />
          {fixtures && (
            <button type="button" onClick={() => setMode("fixture")} className="self-start text-sm underline">
              Back to the fixture list
            </button>
          )}
        </fieldset>
      )}

      {league && <FieldError text={effectiveMode === "fixture" ? errors.kickoffAt : undefined} />}

      <PickFields homeTeam={pickHome} awayTeam={pickAway} values={values} errors={errors} />

      {state.error && <p className="text-red-700">{state.error}</p>}

      <button disabled={pending} className="self-start border px-4 py-2 font-bold">
        {pending ? "Saving…" : "Save pick"}
      </button>
      <p className="text-sm">
        You can change this pick until kickoff. Every change is saved as a new version, so nothing gets quietly
        rewritten.
      </p>
    </form>
  );
}
