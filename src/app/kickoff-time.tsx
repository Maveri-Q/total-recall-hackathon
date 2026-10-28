"use client";

function clock(d: Date): string {
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}${d.getHours() < 12 ? "am" : "pm"}`;
}

/** "8:45pm" today, "Tomorrow 8:45pm", or "Sat 8:45pm", in the viewer's own time zone. */
export function KickoffTime({ iso }: { iso: string }) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = sameDay(d, today) ? "" : sameDay(d, tomorrow) ? "Tomorrow " : `${d.toLocaleDateString(undefined, { weekday: "short" })} `;
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {day}
      {clock(d)}
    </time>
  );
}
