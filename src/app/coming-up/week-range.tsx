"use client";

import { shortDate } from "@/lib/local-time";
import { useNow } from "./hooks";

/** "This week, 29 Oct to 4 Nov", by the viewer's own calendar. */
export function WeekRange() {
  const now = useNow();
  if (now === null) return <span className="min-h-[21px] text-[14px] font-semibold text-muted">This week</span>;
  const end = new Date(now + 6 * 24 * 60 * 60 * 1000);
  return (
    <span className="text-[14px] font-semibold text-muted">
      This week, {shortDate(new Date(now))} to {shortDate(end)}
    </span>
  );
}
