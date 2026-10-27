import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Log in or sign up</h1>
      <p>
        Save your football picks before kickoff. After full time we check how you did, and your past picks start
        telling you things, like how often you&apos;re right when you&apos;re 80% sure.
      </p>
      <p className="text-sm">Just an email and password. No wallet, no betting.</p>
      <LoginForm />
    </main>
  );
}
