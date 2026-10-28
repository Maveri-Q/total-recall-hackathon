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

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(authenticate, {});
  const [showPassword, setShowPassword] = useState(false);

  // Logged in: load /calls fresh from the server, so nothing from before the login is reused.
  useEffect(() => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full page load is the point here
    if (state.done) window.location.assign("/calls");
  }, [state.done]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        Email
        <input name="email" type="email" autoComplete="email" required defaultValue={state.email} className="border p-2" />
      </label>
      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <div className="flex">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            minLength={8}
            className="min-w-0 flex-1 border p-2"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="border border-l-0 px-3"
          >
            <EyeIcon crossed={showPassword} />
          </button>
        </div>
      </div>

      {state.error && <p className="text-red-700">{state.error}</p>}

      <div className="flex gap-3">
        <button name="mode" value="login" disabled={pending || state.done} className="border px-4 py-2">
          Log in
        </button>
        <button name="mode" value="signup" disabled={pending || state.done} className="border px-4 py-2">
          Create account
        </button>
      </div>
    </form>
  );
}
