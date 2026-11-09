"use client";

import { shortDate } from "@/lib/local-time";
import { useNow } from "./hooks";

/** "Next 3 weeks, 9 Nov to 29 Nov", by the viewer's own calendar (the data job lists games 21 days ahead). */
export function WeekRange() {
  const now = useNow();
  if (now === null) return <span className="min-h-[21px] text-[14px] font-semibold text-muted">Next 3 weeks</span>;
  const end = new Date(now + 20 * 24 * 60 * 60 * 1000);
  return (
    <span className="text-[14px] font-semibold text-muted">
      Next 3 weeks, {shortDate(new Date(now))} to {shortDate(end)}
    </span>
  );
}
