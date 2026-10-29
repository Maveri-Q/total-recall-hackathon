"use client";

import Link from "next/link";
import { useState } from "react";
import { signInWithGoogle } from "./actions";
import { LoginForm } from "./login-form";

/** Google (chalk) or email (glass). Both use the existing Supabase sign-in. */
export function SignInChoices() {
  const [email, setEmail] = useState(false);

  return (
    <div className="flex flex-col gap-2.5">
      <form action={signInWithGoogle}>
        <button className="press min-h-[52px] w-full cursor-pointer rounded-full border-none bg-chalk text-[16px] font-semibold text-ground">
          Continue with Google
        </button>
      </form>
      {email ? (
        <LoginForm />
      ) : (
        <button
          type="button"
          onClick={() => setEmail(true)}
          className="press min-h-[52px] cursor-pointer rounded-full border border-white/[0.18] bg-white/[0.06] text-[16px] font-medium text-chalk"
        >
          Continue with email
        </button>
      )}
      <Link href="/" className="inline-flex min-h-11 items-center self-center text-[14px] font-medium">
        Just looking? Browse games
      </Link>
    </div>
  );
}
