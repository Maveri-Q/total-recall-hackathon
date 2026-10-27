"use client";

import { useActionState } from "react";
import { authenticate, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(authenticate, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        Email
        <input name="email" type="email" required defaultValue={state.email} className="border p-2" />
      </label>
      <label className="flex flex-col gap-1">
        Password
        <input name="password" type="password" required minLength={8} className="border p-2" />
      </label>

      {state.error && <p className="text-red-700">{state.error}</p>}

      <div className="flex gap-3">
        <button name="mode" value="login" disabled={pending} className="border px-4 py-2">
          Log in
        </button>
        <button name="mode" value="signup" disabled={pending} className="border px-4 py-2">
          Create account
        </button>
      </div>
    </form>
  );
}
