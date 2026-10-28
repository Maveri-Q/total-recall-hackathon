import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Log in or sign up</h1>
      <p>Make your pick before kickoff. We&apos;ll tell you how you did.</p>
      <LoginForm />
    </main>
  );
}
