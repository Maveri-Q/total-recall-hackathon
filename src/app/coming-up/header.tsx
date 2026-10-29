"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMounted } from "./hooks";

/** "Thursday evening", in the viewer's own time. */
function dayLabel(now: Date): string {
  const day = now.toLocaleDateString("en-GB", { weekday: "long" });
  const h = now.getHours();
  const part = h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "night";
  return `${day} ${part}`;
}

export function ComingUpHeader({ signedIn }: { signedIn: boolean }) {
  const mounted = useMounted();
  const router = useRouter();

  // Readings come in every hour. Check back every 5 minutes so the featured game and odds stay fresh.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="min-h-[19px] text-[13px] text-faint">{mounted ? dayLabel(new Date()) : ""}</span>
        <h1 className="m-0 font-display text-[30px] font-bold leading-[1.05] tracking-[-0.02em]">Coming up</h1>
      </div>
      <Link
        href={signedIn ? "/calls" : "/login"}
        aria-label={signedIn ? "Your calls and account" : "Sign in"}
        className="glass press inline-flex h-11 w-11 items-center justify-center rounded-full text-chalk hover:text-chalk"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 17c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Link>
    </div>
  );
}
