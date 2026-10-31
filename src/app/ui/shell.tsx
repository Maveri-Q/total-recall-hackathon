import type { ReactNode } from "react";

/** Each word of a page title slides up from behind a mask once on load. */
export function PageTitle({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <h1 className="m-0 font-display text-[52px] font-black leading-[0.95] tracking-[-0.045em]">
      {words.map((w, i) => (
        <span key={i}>
          <span className={`word ${i > 0 ? "w2" : ""}`}>
            <span>{w}</span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}

type Blob = "green" | "lime";
const BLOB: Record<Blob, string> = { green: "bg-[#0FA968] opacity-20", lime: "bg-[#C6F36B] opacity-30" };

/**
 * The page frame: light background, at most two soft colour blobs behind the glass (so it has something
 * to blur), phone safe areas, and room at the bottom so the nav never covers content.
 */
export function Shell({
  children,
  blobs = ["lime", "green"],
  wide = false,
}: {
  children: ReactNode;
  blobs?: [Blob, Blob?];
  /** Matches only: from 768px wide (any laptop, even with display scaling) the page widens so games sit in two columns. Phones are unchanged. */
  wide?: boolean;
}) {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden="true" className={`pointer-events-none absolute -right-[120px] -top-[120px] h-[360px] w-[360px] rounded-full blur-[70px] ${BLOB[blobs[0]]}`} />
      {blobs[1] && (
        <div aria-hidden="true" className={`pointer-events-none absolute -left-[140px] top-[520px] h-[340px] w-[340px] rounded-full blur-[80px] ${BLOB[blobs[1]]}`} />
      )}
      <main className={`relative mx-auto flex w-full max-w-[520px] flex-col ${wide ? "md:max-w-[1060px]" : ""} gap-[18px] px-[18px] pb-[calc(118px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]`}>
        {children}
      </main>
    </div>
  );
}
