"use client";

import { clock, dayLabel, weekday, zoneLabel } from "@/lib/local-time";
import { useNow } from "../coming-up/hooks";

type Format =
  | "time" // 5:30pm
  | "zone" // WAT
  | "timeZone" // 5:30pm WAT
  | "dayTime" // Today, 1:30pm WAT
  | "weekdayTime" // Sat 5:30pm WAT
  | "day" // Today / Sat 31 Oct
  | "ago"; // 4 min ago / Yesterday / 28 Oct

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return dayLabel(new Date(iso), new Date(now));
}

/**
 * A time in the viewer's own time zone, with its short name. Renders only in the browser (it needs the
 * viewer's clock and zone), so the server never shows UTC.
 */
export function When({ iso, format }: { iso: string; format: Format }) {
  const now = useNow();
  if (now === null) return <span aria-hidden="true">&nbsp;</span>;
  const d = new Date(iso);
  const zone = zoneLabel(d);
  const text = {
    time: clock(d),
    zone,
    timeZone: `${clock(d)} ${zone}`,
    dayTime: `${dayLabel(d, new Date(now))}, ${clock(d)} ${zone}`,
    weekdayTime: `${weekday(d)} ${clock(d)} ${zone}`,
    day: dayLabel(d, new Date(now)),
    ago: ago(iso, now),
  }[format];
  return <time dateTime={iso}>{text}</time>;
}
