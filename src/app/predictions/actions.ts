"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { getFixture } from "@/lib/football-data";
import { matchFromFixture, parseMatch, parsePick, samePick, type FieldErrors } from "@/lib/prediction-input";
import { addVersion, createPrediction, getPrediction } from "@/lib/predictions";
import { getCurrentUser } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  saved?: boolean;
  values?: Record<string, string>;
};

function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/** A match picked from the fixture list is looked up again here; a typed-in match is checked as typed. */
async function readMatch(raw: Record<string, string>) {
  if (raw.matchMode !== "fixture") return parseMatch(raw);

  const id = Number(raw.fixtureId);
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false as const, errors: { externalMatchId: "Choose a match from the list." } };
  }
  const fixture = await getFixture(id);
  if (!fixture.ok) return { ok: false as const, errors: { externalMatchId: fixture.error } };
  return matchFromFixture(fixture.data, raw.league ?? "");
}

export async function createPredictionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) redirect("/login");
  const raw = formValues(formData);

  const match = await readMatch(raw);
  const pick = parsePick(raw);
  if (!match.ok || !pick.ok) {
    return {
      fieldErrors: { ...(match.ok ? {} : match.errors), ...(pick.ok ? {} : pick.errors) },
      values: raw,
    };
  }

  const result = await createPrediction(match.value, pick.value);
  if (!result.ok) return { error: result.error, values: raw };
  redirect(`/predictions/${result.id}`);
}

export async function editPredictionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) redirect("/login");
  const raw = formValues(formData);

  const prediction = await getPrediction(raw.predictionId ?? "");
  if (!prediction) return { error: "Couldn't find this pick." };

  const pick = parsePick(raw);
  if (!pick.ok) return { fieldErrors: pick.errors, values: raw };

  const latest = prediction.versions.at(-1);
  if (!latest || String(latest.version) !== raw.expectedVersion) {
    return { error: "This pick was changed somewhere else. Reload the page and try again.", values: raw };
  }
  if (samePick(pick.value, latest)) {
    return { error: "Nothing changed, so there's no new version to save.", values: raw };
  }

  const result = await addVersion(prediction, latest.version + 1, pick.value);
  if (!result.ok) return { error: result.error, values: raw };
  refresh();
  return { saved: true };
}
