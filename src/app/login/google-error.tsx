"use client";

import { useSearchParams } from "next/navigation";

export function GoogleError() {
  return useSearchParams().get("error") === "google" ? (
    <p className="m-0 text-[14px] text-error">Couldn&apos;t sign in with Google. Try again.</p>
  ) : null;
}
