// Times in the viewer's own time zone, with the zone's short name ("5:30pm WAT"). Pure functions:
// the browser passes its own clock and zone. Never shown as server or UTC time.

/** "1:30pm" */
export function clock(d: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase().replace(/\s|\./g, "")}`;
}

/** The zone's short name, e.g. "WAT" or "GMT+1", in the viewer's language. */
export function zoneLabel(d: Date, timeZone?: string, locale?: string): string {
  const name = new Intl.DateTimeFormat(locale, { timeZoneName: "short", timeZone }).formatToParts(d).find((p) => p.type === "timeZoneName");
  return name?.value ?? "";
}

function dayKey(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(d);
}

/** "Today", "Tomorrow", "Yesterday", or "Sat 31 Oct". */
export function dayLabel(d: Date, now: Date, timeZone?: string): string {
  const day = 24 * 60 * 60 * 1000;
  const k = dayKey(d, timeZone);
  if (k === dayKey(now, timeZone)) return "Today";
  if (k === dayKey(new Date(now.getTime() + day), timeZone)) return "Tomorrow";
  if (k === dayKey(new Date(now.getTime() - day), timeZone)) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone }).format(d).replace(",", "");
}

/** "Sat 31 Oct" with no "Today": for date ranges. */
export function shortDate(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone }).format(d);
}

/** "Sat" */
export function weekday(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone }).format(d);
}
