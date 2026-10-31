import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { APP_NAME, WORDMARK } from "@/lib/brand";
import { firstName, greeting } from "@/lib/greeting";
import { createClient } from "@/lib/supabase/server";
import { ProfileButton } from "./profile-sheet";

async function SignedInHeader({ next }: { next: string }) {
  await connection();
  // getUser, not just the login cookie: we need the account's name and sign-up date for the greeting.
  const { data } = await (await createClient()).auth.getUser();
  const user = data.user;
  const hello = user ? greeting(firstName(user.user_metadata), user.created_at ?? null, new Date()) : null;
  return <AppHeader email={user?.email ?? null} greeting={hello} next={next} />;
}

/**
 * The header for a page: shows straight away with a neutral placeholder, then "Sign in" or the profile button
 * once we know who's signed in (showing "Sign in" first made signed-in people think they'd been logged out). On its own so the title and intro under it draw once, and only the data streams in.
 */
export function PageHeader({ next }: { next: string }) {
  return (
    <Suspense fallback={<AppHeader email={null} checking next={next} />}>
      <SignedInHeader next={next} />
    </Suspense>
  );
}

/**
 * The small Vernier mark (26px): brand/vernier-favicon.svg, the version with fewer ticks so it stays clear.
 * Bookies' scale on top, Polymarket's below, the lime line where they line up.
 */
export function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 120 120" aria-hidden="true">
      <rect x="1" y="1" width="118" height="118" rx="28" fill="#0B1A14" />
      <rect x="14" y="20" width="92" height="20" rx="5" fill="#F2F5F1" />
      <rect x="30" y="80" width="76" height="20" rx="5" fill="#0FA968" />
      <g strokeLinecap="round" strokeWidth="7">
        <line x1="30" y1="40" x2="30" y2="54" stroke="#F2F5F1" />
        <line x1="51" y1="40" x2="51" y2="54" stroke="#F2F5F1" />
        <line x1="90" y1="80" x2="90" y2="66" stroke="#0FA968" />
      </g>
      <line x1="72" y1="38" x2="72" y2="82" stroke="#C6F36B" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

/** The big wordmark (sign-in page): the dot on the "i" is a small upright bar, like a scale mark. */
export function BigWordmark({ className = "", mark = "#C6F36B" }: { className?: string; mark?: string }) {
  const [before, after] = WORDMARK.split("i", 2);
  return (
    <span role="img" aria-label={WORDMARK} className={`font-display font-extrabold tracking-[-0.045em] ${className}`}>
      <span aria-hidden="true">
        {before}
        <span className="relative inline-block">
          ı
          <span
            className="absolute left-1/2 top-[0.02em] ml-[-0.065em] h-[0.26em] w-[0.13em] rounded-[0.03em]"
            style={{ background: mark }}
          />
        </span>
        {after}
      </span>
    </span>
  );
}

/** Logo and wordmark on the left; "Sign in", or the greeting and profile button, on the right. */
export function AppHeader({
  email,
  greeting,
  checking = false,
  next = "/",
}: {
  email: string | null;
  greeting?: string | null;
  /** Still finding out who's signed in: show a placeholder the size of the profile button. */
  checking?: boolean;
  next?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link href="/" aria-label={`${APP_NAME} home`} className="inline-flex min-h-11 shrink-0 items-center gap-2 font-display text-[18px] font-extrabold tracking-[-0.03em] no-underline">
        <LogoMark />
        {WORDMARK}
      </Link>
      {checking ? (
        <span aria-hidden="true" className="skeleton h-11 w-11 shrink-0 rounded-full" />
      ) : email ? (
        <span className="flex min-w-0 items-center gap-2.5">
          {greeting && <span className="reveal min-w-0 truncate text-[14px] font-semibold text-muted">{greeting}</span>}
          <ProfileButton email={email} />
        </span>
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
