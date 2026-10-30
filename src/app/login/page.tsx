import type { Metadata } from "next";
import { Suspense } from "react";
import { BigWordmark } from "../ui/app-header";
import { Floodlight } from "./floodlight";
import { GoogleError } from "./google-error";
import { SignInChoices } from "./sign-in-choices";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Floodlight>
      <main className="pointer-events-auto flex max-h-[calc(100dvh-24px)] w-full max-w-[420px] flex-col gap-[18px] overflow-y-auto rounded-[28px] border border-white/[0.12] bg-[rgba(8,20,15,0.55)] px-[22px] pb-[22px] pt-[26px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_60px_rgba(0,0,0,0.5)] [-webkit-backdrop-filter:blur(18px)_saturate(140%)] [backdrop-filter:blur(18px)_saturate(140%)]">
        <span className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- the brand SVG as it is, from our own site */}
          <img src="/brand/vernier-icon.svg" alt="" width={36} height={36} className="rounded-[10px] border border-white/25" />
          <BigWordmark className="text-[28px] leading-none" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[30px] font-extrabold leading-[1.08] tracking-[-0.025em]">See who&apos;s been right before you pick.</h1>
          <p className="m-0 text-[15px] leading-normal text-panel-text">
            Bookies vs Polymarket on every big game, and a record of your own calls. Free, no wallet needed.
          </p>
        </div>
        <Suspense>
          <GoogleError />
        </Suspense>
        <Suspense>
          <SignInChoices />
        </Suspense>
      </main>
    </Floodlight>
  );
}
