import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getMemoryPage } from "@/lib/memory-page";
import { DISAGREE_POINTS, historyText } from "@/lib/memory-history";
import { getCurrentUser } from "@/lib/supabase/server";
import { BottomNav } from "../bottom-nav";
import { walrusUrl } from "@/lib/walrus-links";
import { MemoryFeed } from "./feed";

export const metadata: Metadata = { title: "Memory" };

export default function Memory() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-[22px] px-[18px] pb-[calc(110px+env(safe-area-inset-bottom))] pt-[calc(18px+env(safe-area-inset-top))]">
      <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 self-start text-[14px] text-muted no-underline hover:text-chalk">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Coming up
      </Link>
      <div className="-mt-2.5 flex flex-col gap-2">
        <h1 className="m-0 font-display text-[30px] font-bold tracking-[-0.02em]">Memory</h1>
        <p className="m-0 text-[15px] leading-normal text-muted">
          Every game we check becomes a memory, saved on Walrus. Next time the bookies and Polymarket disagree, we look
          back at these.
        </p>
      </div>
      <Suspense fallback={<p className="text-faint">Loading memories…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  await connection();
  const user = await getCurrentUser();
  let page;
  try {
    page = await getMemoryPage(new Date(), user?.id ?? null);
  } catch (e) {
    console.error("memory page", e);
    return (
      <>
        <p className="text-faint">Couldn&apos;t load memories right now. Try again in a minute.</p>
        <BottomNav current="/memory" signedIn={!!user} />
      </>
    );
  }

  return (
    <>
      <div className="lime-mint flex items-center justify-between gap-3 rounded-[24px] p-[18px]">
        <div className="flex flex-col gap-0.5">
          <span className="num font-display text-[40px] font-extrabold leading-none tracking-[-0.03em]">{page.total}</span>
          <span className="text-[14px] font-medium">memories saved on Walrus</span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-[rgba(10,23,18,0.12)] px-2.5 py-1 text-[13px] font-semibold">{page.today} new today</span>
          {page.newestBlobId && (
            <a
              href={walrusUrl(page.newestBlobId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-[13px] font-semibold text-ground hover:text-ground"
            >
              Check on Walrus
            </a>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-2.5" aria-labelledby="scores">
        <h2 id="scores" className="m-0 font-display text-[20px] font-bold tracking-[-0.01em]">
          How the scores changed
        </h2>
        {page.leagues.length === 0 && <p className="m-0 text-[14px] text-faint">No finished games yet.</p>}
        {page.leagues.map((lg) => (
          <div key={lg.leagueCode} className="glass flex items-center justify-between gap-3 rounded-[18px] p-3.5">
            <div className="flex flex-col gap-1">
              <span className="font-display text-[16px] font-semibold">{lg.name}</span>
              <span className="num text-[13px] text-faint">{historyText(lg)}</span>
            </div>
            <span className="num flex items-baseline gap-1.5 whitespace-nowrap font-display text-[20px] font-bold" aria-label={`Bookies ${lg.now.bookies}, Polymarket ${lg.now.polymarket}`}>
              <span className="text-bookies">{lg.now.bookies}</span>
              <span className="text-[#3E5A4D]">-</span>
              <span className="text-poly">{lg.now.polymarket}</span>
            </span>
          </div>
        ))}
        <span className="text-[12px] text-fainter">
          Bookies on the left, Polymarket on the right. Counts games where the bookies and Polymarket were{" "}
          {DISAGREE_POINTS} or more points apart.
        </span>
        <Link href="/scorecard" className="inline-flex min-h-11 items-center self-start text-[13px] font-medium">
          See the full scorecard
        </Link>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="latest">
        <h2 id="latest" className="m-0 font-display text-[20px] font-bold tracking-[-0.01em]">
          Latest memories
        </h2>
        <MemoryFeed feed={page.feed} signedIn={!!user} />
      </section>

      <BottomNav current="/memory" signedIn={!!user} />
    </>
  );
}
