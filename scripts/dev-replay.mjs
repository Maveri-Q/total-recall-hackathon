// Runs the app on this laptop as it stood at a past moment, for recording the demo video (see src/lib/app-now.ts).
// Usage: node scripts/dev-replay.mjs [ISO time]   (default: Sun 1 Nov 2026, 12:00 UTC)
import { spawn } from "node:child_process";
const at = process.argv[2] ?? "2026-11-01T12:00:00Z";
console.log(`Replaying ${at} on http://localhost:3005`);
spawn("npx", ["next", "dev", "-p", "3005"], { stdio: "inherit", shell: true, env: { ...process.env, VERNIER_REPLAY_AT: at } });
