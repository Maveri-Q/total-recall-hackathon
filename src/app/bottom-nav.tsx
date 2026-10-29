import Link from "next/link";

export type NavPage = "/" | "/calls" | "/records" | "/proof";

const ACTIVE = "#C6F36B";

function Icon({ page, active }: { page: NavPage; active: boolean }) {
  const c = active ? ACTIVE : "currentColor";
  switch (page) {
    case "/":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke={c} strokeWidth="1.6" />
          <path d="M10 6 L13.2 8.3 L12 12 H8 L6.8 8.3 Z" fill={c} />
        </svg>
      );
    case "/calls":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3.5" y="2.5" width="13" height="15" rx="3" stroke={c} strokeWidth="1.6" />
          <path d="M7 9.5l2 2 4-4" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "/records":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 16V9M10 16V4M16 16v-5" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "/proof":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2.5 L16 5 V10 C16 13.6 13.4 16.4 10 17.5 C6.6 16.4 4 13.6 4 10 V5 Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M7.3 10l1.9 1.9 3.6-3.8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

const ITEMS: { href: NavPage; label: string }[] = [
  { href: "/", label: "Matches" },
  { href: "/calls", label: "My calls" },
  { href: "/records", label: "Records" },
  { href: "/proof", label: "Proof" },
];

/** Floating glass bar, 4 equal items, each a 20px icon over a 12px label. The current page is ink. */
export function BottomNav({ current }: { current: NavPage | null }) {
  return (
    <nav
      aria-label="Main"
      className="glass fixed inset-x-[14px] bottom-[calc(14px+env(safe-area-inset-bottom))] z-20 mx-auto grid max-w-[492px] grid-cols-4 gap-1 rounded-[26px] p-1.5"
    >
      {ITEMS.map(({ href, label }) => {
        const active = href === current;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[54px] flex-col items-center justify-center gap-[3px] rounded-[20px] text-[12px] font-semibold no-underline ${
              active ? "bg-ink text-white hover:text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            <Icon page={href} active={active} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
