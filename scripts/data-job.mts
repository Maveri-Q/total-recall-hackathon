// Entry point for the hourly data job: `npm run data-job`.
// On GitHub Actions the keys come from repo secrets. On your laptop they come from .env.local.
import { existsSync } from "node:fs";
import { runDataJob } from "../src/lib/data-job/run";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

try {
  const summary = await runDataJob();
  for (const line of summary.log) console.log(line);
  console.log(
    `Done. Readings saved: ${summary.readingsSaved}. Odds API credits used: ${summary.creditsUsed}, ` +
      `left this month: ${summary.creditsRemaining ?? "unknown"}.`,
  );
} catch (e) {
  console.error("Data job failed:", e instanceof Error ? e.message : e);
  process.exit(1);
}
