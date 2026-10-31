"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, ITEMS } from "./bottom-nav";

/** Desktop navigation in the header (1024px and wider): the bottom bar's four items in one row. */
export function TopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="glass hidden gap-1 rounded-full p-1 lg:flex">
      {ITEMS.map(({ href, label }) => {
        const active = href === path;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold no-underline ${
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
