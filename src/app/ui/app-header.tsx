import Link from "next/link";
import { APP_NAME, WORDMARK } from "@/lib/brand";
import { ProfileButton } from "./profile-sheet";

/** The small favicon mark on ink (26px), as in design-reference/. */
export function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 120 120" aria-hidden="true">
      <rect width="120" height="120" rx="28" fill="#0B1A14" />
      <g transform="translate(6 6) scale(0.9) rotate(-5 60 60)">
        <path d="M14 44 Q14 34 26 33 L94 33 Q106 34 106 44 L102 80 Q100 90 88 90 L32 90 Q20 90 18 80 Z" fill="none" stroke="#F2F5F1" strokeWidth="11" strokeLinejoin="round" />
        <rect x="40" y="46" width="14" height="14" fill="#F5A524" />
        <circle cx="72" cy="72" r="13" fill="#8FD3FF" />
      </g>
    </svg>
  );
}

/** Logo and wordmark on the left; "Sign in" or the profile button on the right. */
export function AppHeader({ email, next = "/" }: { email: string | null; next?: string }) {
  return (
    <div className="flex items-center justify-between">
      <Link href="/" aria-label={`${APP_NAME} home`} className="inline-flex min-h-11 items-center gap-2 font-display text-[18px] font-extrabold tracking-[-0.03em] no-underline">
        <LogoMark />
        {WORDMARK}
      </Link>
      {email ? (
        <ProfileButton email={email} />
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="press inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-white no-underline hover:text-white"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
