import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { getProofPage } from "@/lib/proof-page";
import { getCurrentUser } from "@/lib/supabase/server";
import { BottomNav } from "../bottom-nav";
import { PageHeader } from "../ui/app-header";
import { CardSkeleton } from "../ui/skeleton";
import { PageTitle, Shell } from "../ui/shell";
import { When } from "../ui/when";
import { MemoryList, StampRow } from "./proof-lists";

export const metadata: Metadata = { title: "Proof" };

const STEPS = [
  { title: "Read the odds", tag: "Tatum", text: "Polymarket prices via Tatum, bookie odds via The Odds API.", color: "bg-ink" },
  { title: "Stamp them", tag: "Sui", text: "Locked on Sui before kickoff, so nobody can change them later.", color: "bg-poly" },
  { title: "Remember it", tag: "Walrus", text: "Odds, result and who got closer, saved on Walrus.", color: "bg-hero-number" },
  { title: "Use it next time", tag: "Walrus", text: "Past games like it come back from Walrus to show who to trust.", color: "bg-hero-number" },
];

export default function Proof() {
  return (
    <Shell blobs={["lime", "green"]}>
      <PageHeader next="/proof" />
      <div className="flex flex-col gap-2 pt-2.5">
        <PageTitle text="Proof" />
        <p className="m-0 text-[16px] leading-[1.45] text-muted">Where every number comes from, and where you can check it.</p>
      </div>
      <Suspense fallback={<ProofColumns left={<Steps />} right={<ProofLoading />} />}>
        <Content />
      </Suspense>
      <BottomNav current="/proof" />
    </Shell>
  );
}

function Steps() {
  return (
    <section aria-label="How it works" className="glass flex flex-col rounded-[26px] px-4 py-[18px]">
      {STEPS.map((s, i) => (
        <div key={s.title} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
          <div className="flex flex-col items-center">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-display text-[15px] font-black text-white ${s.color}`}>{i + 1}</span>
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className="relative min-h-[26px] w-[2px] flex-1 overflow-hidden bg-[rgba(11,26,20,0.1)]">
                <span className="flow absolute left-0 h-3 w-[2px] bg-mint" />
              </span>
            )}
          </div>
          <div className="flex flex-col gap-[3px] pb-4 pt-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[17px] font-extrabold tracking-[-0.02em]">{s.title}</span>
              <span className="rounded-full bg-[rgba(11,26,20,0.06)] px-2 py-[3px] text-[12px] font-bold text-ink-2">{s.tag}</span>
            </span>
            <span className="text-[14px] leading-[1.45] text-muted">{s.text}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

/**
 * Desktop (1024px+): how it works and the live counters on the left, the Walrus and Sui lists on the right.
 * On phones the two simply stack, in the same order as before.
 */
function ProofColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex flex-col gap-[18px] lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="flex flex-col gap-[18px] lg:sticky lg:top-6">{left}</div>
      <div className="flex flex-col gap-[18px]">{right}</div>
    </div>
  );
}

/** Placeholder counters and rows while the live numbers load. */
function ProofLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-[18px]">
      <span className="sr-only">Loading the live numbers</span>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} lines={1} className="min-h-[96px] rounded-[20px]" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <CardSkeleton key={i} lines={1} className="rounded-[18px]" />
      ))}
    </div>
  );
}

async function Content() {
  await connection();
  const user = await getCurrentUser();
  let page;
  try {
    page = await getProofPage(new Date(), user?.id ?? null);
  } catch (e) {
    console.error("proof page", e);
    page = null;
  }

  if (!page) {
    return <ProofColumns left={<Steps />} right={<p className="text-muted">Couldn&apos;t load the live numbers right now. Try again in a minute.</p>} />;
  }
  return (
    <ProofColumns
      left={
        <>
          <Steps />
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: page.memories, label: "Walrus memories" },
              { n: page.stamps, label: "Sui stamps" },
              { n: page.polymarketChecksToday, label: "Polymarket checks via Tatum today" },
            ].map((c) => (
              <div key={c.label} className="glass flex flex-col gap-0.5 rounded-[20px] px-2.5 py-3.5">
                <span className="num font-display text-[30px] font-black tracking-[-0.04em]">{c.n}</span>
                <span className="text-[12px] font-semibold leading-[1.3] text-muted">{c.label}</span>
              </div>
            ))}
          </div>
        </>
      }
      right={
        <>
          <section className="flex flex-col gap-2.5" aria-labelledby="walrus">
            <h2 id="walrus" className="m-0 font-display text-[24px] font-extrabold tracking-[-0.035em]">
              Remembered on Walrus
            </h2>
            <MemoryList game={page.gameMemories} mine={page.myMemories} />
          </section>

          <section className="flex flex-col gap-2.5" aria-labelledby="sui">
            <h2 id="sui" className="m-0 font-display text-[24px] font-extrabold tracking-[-0.035em]">
              Stamped on Sui
            </h2>
            <p className="-mt-1 mb-0 text-[14px] leading-[1.45] text-muted">Saved before kickoff, so nobody can change them after the result.</p>
            {page.latestStamps.map((s) => (
              <StampRow key={s.key} stamp={s} />
            ))}
          </section>

          <section className="glass flex flex-col gap-2.5 rounded-[22px] p-4" aria-labelledby="tatum">
            <h2 id="tatum" className="m-0 font-display text-[20px] font-extrabold tracking-[-0.03em]">
              Live from Tatum
            </h2>
            {[
              { label: "Last Polymarket price check", value: page.lastPolymarketCheck && <When iso={page.lastPolymarketCheck} format="dayTime" /> },
              { label: "Last Sui stamp sent", value: page.lastSuiStamp && <When iso={page.lastSuiStamp} format="dayTime" /> },
              { label: "Network", value: "Sui Mainnet" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-2.5 border-t border-[rgba(11,26,20,0.06)] py-1.5 text-[14px]">
                <span className="text-ink-2">{row.label}</span>
                <span className="text-right font-bold">{row.value ?? "Not yet"}</span>
              </div>
            ))}
          </section>
        </>
      }
    />
  );
}
