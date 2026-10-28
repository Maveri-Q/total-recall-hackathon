import { Suspense } from "react";
import { signInWithGoogle } from "./actions";
import { GoogleError } from "./google-error";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Log in or sign up</h1>
      <p>Make your pick before kickoff. We&apos;ll tell you how you did.</p>
      <form action={signInWithGoogle}>
        <button className="w-full border px-4 py-2">Continue with Google</button>
      </form>
      <Suspense>
        <GoogleError />
      </Suspense>
      <p className="text-center text-sm">or use your email</p>
      <LoginForm />
    </main>
  );
}
