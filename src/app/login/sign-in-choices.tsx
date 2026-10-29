"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeNext } from "@/lib/next-path";
import { signInWithGoogle } from "./actions";
import { LoginForm } from "./login-form";

/**
 * Google (lime) or email (outline). Both use the existing Supabase sign-in. `next` brings the user back
 * where they were, e.g. the game they tapped a call on.
 */
export function SignInChoices() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState(params.get("email") === "1");

  return (
    <div className="flex flex-col gap-2.5">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button className="press min-h-[52px] w-full cursor-pointer rounded-full border-none bg-lime text-[16px] font-bold text-ink">Continue with Google</button>
      </form>
      {email ? (
        <LoginForm next={next} />
      ) : (
        <button
          type="button"
          onClick={() => setEmail(true)}
          className="press min-h-[52px] cursor-pointer rounded-full border border-white/[0.22] bg-white/[0.06] text-[16px] font-semibold text-white"
        >
          Continue with email
        </button>
      )}
      <Link href="/" className="inline-flex min-h-11 items-center self-center text-[14px] font-semibold text-[#DCE6E0] hover:text-white">
        Just looking? Browse games
      </Link>
    </div>
  );
}
