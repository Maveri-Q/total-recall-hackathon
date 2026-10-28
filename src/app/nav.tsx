import Link from "next/link";

const LINKS = [
  { href: "/", label: "Coming up" },
  { href: "/scorecard", label: "Scorecard" },
  { href: "/calls", label: "Your calls" },
] as const;

/** The page title plus links to the other two pages. */
export function PageHeader({ title, current }: { title: string; current: (typeof LINKS)[number]["href"] }) {
  return (
    <div className="flex flex-col gap-1">
      <nav className="flex gap-4 text-sm">
        {LINKS.filter((l) => l.href !== current).map((l) => (
          <Link key={l.href} href={l.href} className="underline">
            {l.label}
          </Link>
        ))}
      </nav>
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
}
