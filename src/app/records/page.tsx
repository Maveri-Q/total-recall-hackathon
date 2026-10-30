import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getMyScorecard, getSourceScorecard } from "@/lib/scorecard";
import { getCurrentUser } from "@/lib/supabase/server";
import { BottomNav } from "../bottom-nav";
import { PageHeader } from "../ui/app-header";
import { PageTitle, Shell } from "../ui/shell";
import { RecordsView } from "./records-view";

export const metadata: Metadata = { title: "Records" };

export default function Records() {
  return (
    <Shell blobs={["green", "lime"]}>
      <PageHeader next="/records" />
      <div className="flex flex-col gap-2 pt-2.5">
        <PageTitle text="Records" />
        <p className="m-0 text-[16px] leading-[1.45] text-muted">After every game, we check who got closer to the real result.</p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading records...</p>}>
        <Sources />
      </Suspense>
      <section className="flex flex-col gap-2.5" aria-labelledby="you-vs">
        <h2 id="you-vs" className="m-0 font-display text-[24px] font-extrabold tracking-[-0.035em]">
          You vs the market
        </h2>
        <Suspense fallback={<p className="text-muted">Loading your record...</p>}>
          <Mine />
        </Suspense>
      </section>
      <BottomNav current="/records" />
    </Shell>
  );
}


async function Sources() {
  let all;
  try {
    all = await getSourceScorecard();
  } catch (e) {
    console.error("records", e);
    return <p className="text-muted">Couldn&apos;t load the records right now. Try again in a minute.</p>;
  }
  return <RecordsView all={all.find((l) => l.code === "ALL") ?? null} leagues={all.filter((l) => l.code !== "ALL")} />;
}

function Tile({ value, label, tone }: { value: string; label: string; tone?: "poly" | "bookies" }) {
  return (
    <div
      className={`glass flex flex-col gap-1 rounded-[20px] px-2.5 py-3.5 ${
        tone === "poly" ? "border-[rgba(15,169,104,0.4)]" : tone === "bookies" ? "border-[rgba(30,43,37,0.5)]" : ""
      }`}
    >
      <span className={`num font-display text-[28px] font-black tracking-[-0.04em] ${tone === "poly" ? "text-poly-text" : ""}`}>{value}</span>
      <span className="text-[12px] font-semibold leading-[1.3] text-muted">{label}</span>
    </div>
  );
}

async function Mine() {
  await connection();
  if (!(await getCurrentUser())) {
    return (
      <Link href="/login?next=/records" className="glass flex min-h-11 items-center justify-between rounded-[20px] px-4 py-3.5 font-semibold no-underline">
        Sign in to see your record
        <span aria-hidden="true">›</span>
      </Link>
    );
  }
  const me = await getMyScorecard();
  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile value={`${me.right}/${me.settled}`} label="Your calls right" />
      <Tile value={`${me.againstPolymarket.right}/${me.againstPolymarket.total}`} label="When you picked differently from Polymarket" tone="poly" />
      <Tile value={`${me.againstBookies.right}/${me.againstBookies.total}`} label="When you picked differently from the bookies" tone="bookies" />
    </div>
  );
}
