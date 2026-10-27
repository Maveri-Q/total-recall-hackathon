"use client";

/** Shows a time in the viewer's own timezone. The server renders UTC, the browser swaps in local time. */
export function LocalTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}
