"use client";

import { useEffect, useState } from "react";
import type { ThreeWay } from "@/lib/odds";
import { Info } from "../info";
import { useReducedMotion } from "./hooks";

const pct = (x: number) => Math.round(x * 100);

const SOURCES = {
  bookies: { name: "Bookies", color: "text-bookies", mark: "mark-bookies" },
  poly: { name: "Polymarket", color: "text-poly", mark: "mark-poly" },
} as const;

function SourceInfo({ source, id }: { source: keyof typeof SOURCES; id: string }) {
  return source === "bookies" ? (
    <Info id={`bookies-${id}`} label="About the bookies' chance">
      We turn the bookies&apos; odds into a chance, so you can compare them with Polymarket.
    </Info>
  ) : (
    <Info id={`poly-${id}`} label="What is Polymarket?">
      Polymarket is a site where people put real money on what will happen. Its price shows the chance they give each
      result.
    </Info>
  );
}

function Label({ source, id }: { source: keyof typeof SOURCES; id: string }) {
  const s = SOURCES[source];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${s.color}`}>
      <span aria-hidden="true" className={s.mark} />
      {s.name}
      <SourceInfo source={source} id={id} />
    </span>
  );
}

function Pills({ chances, labels, color }: { chances: ThreeWay; labels: [string, string, string]; color: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(["home", "draw", "away"] as const).map((o, i) => (
        <span
          key={o}
          className="flex min-w-0 flex-col items-center gap-0.5 rounded-[14px] border border-white/[0.07] bg-white/5 px-1 py-[9px]"
        >
          <span className="max-w-full truncate text-[12px] text-faint">{labels[i]}</span>
          <span className={`num font-display text-[17px] font-bold ${color}`}>{pct(chances[o])}%</span>
        </span>
      ))}
    </div>
  );
}

/**
 * The three chances, sliding between the bookies' set and Polymarket's every 3.2 seconds.
 * Pauses while the card is touched. With reduced motion, both sets show stacked instead.
 */
export function SlidingOdds({
  id,
  bookies,
  poly,
  labels,
  paused,
}: {
  id: string;
  bookies: ThreeWay;
  poly: ThreeWay | null;
  labels: [string, string, string];
  paused: boolean;
}) {
  const reduce = useReducedMotion();
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (!poly || reduce || paused) return;
    const t = setInterval(() => setSlide((s) => (s ? 0 : 1)), 3200);
    return () => clearInterval(t);
  }, [poly, reduce, paused]);

  if (!poly) {
    return (
      <div className="flex flex-col gap-2">
        <Label source="bookies" id={id} />
        <Pills chances={bookies} labels={labels} color="text-bookies" />
      </div>
    );
  }

  if (reduce) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label source="bookies" id={id} />
          <Pills chances={bookies} labels={labels} color="text-bookies" />
        </div>
        <div className="flex flex-col gap-2">
          <Label source="poly" id={id} />
          <Pills chances={poly} labels={labels} color="text-poly" />
        </div>
      </div>
    );
  }

  const source = slide === 0 ? "bookies" : "poly";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span aria-live="polite">
          <Label source={source} id={id} />
        </span>
        <span className="flex gap-[5px]" aria-hidden="true">
          <span className={`h-[5px] rounded-[3px] transition-[width] duration-300 ${slide === 0 ? "w-4 bg-chalk" : "w-[5px] bg-chalk/30"}`} />
          <span className={`h-[5px] rounded-[3px] transition-[width] duration-300 ${slide === 1 ? "w-4 bg-chalk" : "w-[5px] bg-chalk/30"}`} />
        </span>
      </div>
      <div className="overflow-hidden rounded-[14px]">
        <div className="slider flex w-[200%]" style={{ transform: `translateX(${slide === 0 ? "0" : "-50%"})` }}>
          <div className="w-1/2" aria-hidden={slide !== 0}>
            <Pills chances={bookies} labels={labels} color="text-bookies" />
          </div>
          <div className="w-1/2" aria-hidden={slide !== 1}>
            <Pills chances={poly} labels={labels} color="text-poly" />
          </div>
        </div>
      </div>
    </div>
  );
}
