"use client";

import { useSearchParams } from "next/navigation";

export function GoogleError() {
  return useSearchParams().get("error") === "google" ? (
    <p className="text-red-700">Couldn&apos;t sign in with Google. Try again.</p>
  ) : null;
}
