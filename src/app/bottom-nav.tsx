import Link from "next/link";

type Page = "/" | "/calls" | "/memory" | "/login";

const ICONS: Record<Page, React.ReactNode> = {
  "/": (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.6 L10.6 6.5 L9.6 9.6 H6.4 L5.4 6.5 Z" fill="currentColor" />
    </svg>
  ),
  "/calls": (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="3" y="2.5" width="12" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 7.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "/memory": (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="13" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7.5h7M5.5 10.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "/login": (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6.5" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 15.5c1.1-2.7 3.4-4 6-4s4.9 1.3 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

/** Floating glass bar at the bottom of the screen. The current page shows as a lime pill with its name. */
export function BottomNav({ current, signedIn }: { current: Page; signedIn: boolean }) {
  const items: { href: Page; label: string }[] = [
    { href: "/", label: "Coming up" },
    { href: "/calls", label: "Your calls" },
    { href: "/memory", label: "Memory" },
    ...(signedIn ? [] : [{ href: "/login" as const, label: "Sign in" }]),
  ];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-[calc(14px+env(safe-area-inset-bottom))] z-20 flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex gap-1.5 rounded-full border border-white/[0.08] bg-[rgba(20,40,32,0.85)] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-[14px]">
        {items.map(({ href, label }) =>
          href === current ? (
            <Link
              key={href}
              href={href}
              aria-current="page"
              className="lime-mint inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold no-underline hover:text-ground"
            >
              {ICONS[href]}
              {label}
            </Link>
          ) : (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-chalk"
            >
              {ICONS[href]}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
