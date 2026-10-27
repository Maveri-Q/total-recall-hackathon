"use client";

import { useActionState } from "react";
import { editPredictionAction, type FormState } from "../actions";
import { PickFields } from "../pick-fields";

export function EditPredictionForm({
  predictionId,
  latestVersion,
  homeTeam,
  awayTeam,
  current,
}: {
  predictionId: string;
  latestVersion: number;
  homeTeam: string;
  awayTeam: string;
  current: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(editPredictionAction, {});
  // After a save the page reloads with the new version, so start from the saved pick again.
  const values = state.saved ? current : (state.values ?? current);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="predictionId" value={predictionId} />
      <input type="hidden" name="expectedVersion" value={latestVersion} />
      <PickFields homeTeam={homeTeam} awayTeam={awayTeam} values={values} errors={state.fieldErrors ?? {}} />
      {state.error && <p className="text-red-700">{state.error}</p>}
      {state.saved && <p className="text-green-800">Saved as version {latestVersion}.</p>}
      <button disabled={pending} className="self-start border px-4 py-2">
        {pending ? "Saving…" : "Save as new version"}
      </button>
    </form>
  );
}
