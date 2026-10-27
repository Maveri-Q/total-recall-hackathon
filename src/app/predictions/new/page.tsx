import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { NewPredictionForm } from "./new-prediction-form";

export default function NewPredictionPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <Link href="/" className="underline">
        ← Your picks
      </Link>
      <h1 className="text-2xl font-bold">New pick</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <SignedInForm />
      </Suspense>
    </main>
  );
}

async function SignedInForm() {
  await connection();
  if (!(await getCurrentUser())) redirect("/login");
  return <NewPredictionForm />;
}
