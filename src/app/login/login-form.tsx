"use client";

import { useActionState, useEffect, useState } from "react";
import { authenticate, type LoginState } from "./actions";

/** An eye, or an eye with a line through it once the password is showing. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  );
}

const FIELD =
  "min-h-12 rounded-2xl border border-white/20 bg-white/[0.06] px-3.5 text-[16px] font-normal text-white outline-none focus-visible:outline-2 focus-visible:outline-white";

export function LoginForm({ next = "/calls" }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(authenticate, {});
  const [showPassword, setShowPassword] = useState(false);

  // Logged in: load the next page fresh from the server, so nothing from before the login is reused.
  useEffect(() => {
    if (state.done) window.location.assign(next);
  }, [state.done, next]);

  return (
    <form action={formAction} className="reveal mt-1 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[13px] font-medium text-panel-text">
        Email
        <input name="email" type="email" autoComplete="email" required autoFocus defaultValue={state.email} className={FIELD} />
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-[13px] font-medium text-panel-text">
          Password
        </label>
        <div className="flex rounded-2xl border border-white/20 bg-white/[0.06] focus-within:outline focus-within:outline-2 focus-within:outline-white">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            className="min-h-12 min-w-0 flex-1 rounded-l-2xl bg-transparent px-3.5 text-[16px] text-white outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="inline-flex min-w-12 cursor-pointer items-center justify-center rounded-r-2xl text-panel-text hover:text-white"
          >
            <EyeIcon crossed={showPassword} />
          </button>
        </div>
      </div>

      {state.error && <p className="m-0 text-[14px] font-semibold text-[#FF9B8F]">{state.error}</p>}

      <div className="grid grid-cols-2 gap-2.5">
        <button name="mode" value="login" disabled={pending || state.done} className="press min-h-12 cursor-pointer rounded-full bg-lime text-[15px] font-bold text-ink">
          Log in
        </button>
        <button name="mode" value="signup" disabled={pending || state.done} className="press min-h-12 cursor-pointer rounded-full border border-white/[0.22] bg-white/[0.06] text-[15px] font-semibold text-white">
          Create account
        </button>
      </div>
    </form>
  );
}
