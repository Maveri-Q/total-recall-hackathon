"use client";

import { useState } from "react";
import type { FieldErrors } from "@/lib/prediction-input";

export function FieldError({ text }: { text?: string }) {
  return text ? <span className="text-sm text-red-700">{text}</span> : null;
}

/** The pick, confidence, reason and "whose pick" inputs. Shared by the new-pick and edit forms. */
export function PickFields({
  homeTeam,
  awayTeam,
  values,
  errors,
}: {
  homeTeam: string;
  awayTeam: string;
  values: Record<string, string>;
  errors: FieldErrors;
}) {
  const [sourceType, setSourceType] = useState(values.sourceType ?? (values.source ? "tip" : "mine"));

  const options = [
    { value: "home", label: `${homeTeam || "Home team"} win` },
    { value: "draw", label: "Draw" },
    { value: "away", label: `${awayTeam || "Away team"} win` },
  ];

  return (
    <>
      <fieldset className="flex flex-col gap-1">
        <legend className="font-bold">Your pick</legend>
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <input type="radio" name="pick" value={o.value} defaultChecked={values.pick === o.value} required />
            {o.label}
          </label>
        ))}
        <FieldError text={errors.pick} />
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="font-bold">How sure are you? (%)</span>
        <span className="text-sm">50 means it could go either way. 90 means you&apos;d be shocked if you were wrong.</span>
        <input
          name="confidence"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          required
          defaultValue={values.confidence}
          className="w-32 border p-2"
        />
        <FieldError text={errors.confidence} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-bold">Why this pick?</span>
        <input
          name="reason"
          required
          maxLength={280}
          defaultValue={values.reason}
          placeholder="e.g. Chelsea are missing both centre-backs"
          className="border p-2"
        />
        <FieldError text={errors.reason} />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="font-bold">Whose pick is this?</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="sourceType"
            value="mine"
            checked={sourceType === "mine"}
            onChange={() => setSourceType("mine")}
          />
          My own call
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="sourceType"
            value="tip"
            checked={sourceType === "tip"}
            onChange={() => setSourceType("tip")}
          />
          I&apos;m following someone else&apos;s tip
        </label>
        {sourceType === "tip" && (
          <label className="mt-1 flex flex-col gap-1">
            Who gave the tip?
            <input
              name="source"
              maxLength={120}
              defaultValue={values.source}
              placeholder="e.g. a tipster's name, @account, or a friend"
              className="border p-2"
            />
            <span className="text-sm">We&apos;ll track how their tips turn out for you.</span>
          </label>
        )}
        <FieldError text={errors.source} />
      </fieldset>
    </>
  );
}
