// Opens a browser window on the live sign-in page so a person can sign in by hand (password typed by them,
// never recorded). Once signed in, the session is saved to video/build/judge-state.json (git-ignored) for
// record.mts to reuse, and the window closes. Delete that file after recording.
// Run: npx tsx video/judge-login.mts
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const STATE = join(import.meta.dirname, "build", "judge-state.json");
mkdirSync(join(import.meta.dirname, "build"), { recursive: true });

// Microsoft Edge, which every Windows laptop has, so no extra browser download is needed.
const browser = await chromium.launch({ headless: false, channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 430, height: 860 } });
const page = await ctx.newPage();
await page.goto("https://vernier-odds.vercel.app/login");
console.log("Window open. Sign in there with the judge account.");

const deadline = Date.now() + 15 * 60_000;
while (Date.now() < deadline) {
  const cookies = await ctx.cookies().catch(() => []);
  const signedIn = cookies.some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (signedIn && !page.url().includes("/login")) {
    await page.waitForTimeout(1500);
    await ctx.storageState({ path: STATE });
    console.log("Signed in. Session saved for the recorder.");
    await browser.close();
    process.exit(0);
  }
  await page.waitForTimeout(1000).catch(() => {});
}
console.log("Timed out after 15 minutes without a sign-in.");
await browser.close();
process.exit(1);
