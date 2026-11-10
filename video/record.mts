// Records the app scenes for the demo video at phone size (390x844, 2x), frame by frame through Chrome's
// screencast, so scrolling and number animations come out smooth. Each clip is saved as JPEG frames plus an
// index (30 fps) that the stage page (stage.html) plays inside the phone.
//
// Run: npx tsx video/record.mts [clip names...]
// Replay clips need the laptop replay server (node scripts/dev-replay.mjs) on port 3005.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "playwright";

const LIVE = "https://vernier-odds.vercel.app";
const REPLAY = "http://localhost:3005";
const REPLAY_AT = "2026-11-01T12:00:00Z";
const OUT = join(import.meta.dirname, "build", "clips");
const FPS = 30;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A soft touch dot and ripple, so viewers can see each tap. Also hides the Next.js dev badge. */
const TOUCH_UI = `
  (() => {
    const css = document.createElement('style');
    css.textContent = \`
      nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
      .vt-dot { position: fixed; z-index: 2147483647; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
        background: rgba(11,26,20,0.16); border: 2px solid rgba(11,26,20,0.35); pointer-events: none;
        transition: transform .28s ease, opacity .28s ease; transform: scale(.6); opacity: 0; }
      .vt-dot.on { transform: scale(1); opacity: 1; }
      .vt-dot.press { transform: scale(.82); background: rgba(198,243,107,0.55); border-color: rgba(15,169,104,0.9); }
      .vt-ring { position: fixed; z-index: 2147483646; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
        border: 3px solid rgba(15,169,104,0.75); pointer-events: none; animation: vt-ring .6s ease-out forwards; }
      @keyframes vt-ring { from { transform: scale(.6); opacity: 1 } to { transform: scale(2.3); opacity: 0 } }
      html { scroll-behavior: auto !important; }
    \`;
    const addCss = () => (document.head || document.documentElement).appendChild(css);
    if (document.documentElement) addCss(); else document.addEventListener('DOMContentLoaded', addCss);
    window.__vtDot = (x, y, state) => {
      let d = document.querySelector('.vt-dot');
      if (!d) { d = document.createElement('div'); d.className = 'vt-dot'; document.body.appendChild(d); }
      d.style.left = x + 'px'; d.style.top = y + 'px';
      d.className = 'vt-dot' + (state === 'off' ? '' : state === 'press' ? ' on press' : ' on');
      if (state === 'press') { const r = document.createElement('div'); r.className = 'vt-ring'; r.style.left = x + 'px'; r.style.top = y + 'px';
        document.body.appendChild(r); setTimeout(() => r.remove(), 700); }
    };
    /** Eased scroll to a page Y over ms, so it reads as a slow, human scroll. */
    window.__vtScroll = (y, ms) => new Promise((done) => {
      const from = window.scrollY, to = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
      const t0 = performance.now(); const ease = (t) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
      const step = (now) => { const t = Math.min(1, (now - t0) / ms); window.scrollTo(0, from + (to - from) * ease(t)); t < 1 ? requestAnimationFrame(step) : done(); };
      requestAnimationFrame(step);
    });
  })();
`;

type Frame = { data: Buffer; t: number };

class Clip {
  frames: Frame[] = [];
  private cdp: Awaited<ReturnType<ReturnType<Page["context"]>["newCDPSession"]>> | null = null;
  constructor(public name: string, public page: Page) {}

  async start() {
    this.cdp = await this.page.context().newCDPSession(this.page);
    this.cdp.on("Page.screencastFrame", async (f) => {
      this.frames.push({ data: Buffer.from(f.data, "base64"), t: f.metadata.timestamp ?? Date.now() / 1000 });
      await this.cdp!.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await this.cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
    this.mark = Date.now() / 1000;
    // A tiny repaint so the clip starts with a frame.
    await this.page.evaluate(() => window.scrollBy(0, 0));
  }
  mark = 0;
  /** Named moments (seconds into the clip) the stage uses to line up captions with what's on screen. */
  marks: Record<string, number> = {};
  at(label: string) {
    this.marks[label] = Date.now() / 1000 - this.mark;
  }

  async stop() {
    await this.cdp?.send("Page.stopScreencast");
    const end = Date.now() / 1000;
    const dir = join(OUT, this.name);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const fr = this.frames.filter((f) => f.t >= this.mark - 0.5).sort((a, b) => a.t - b.t);
    if (fr.length === 0) throw new Error(`${this.name}: no frames`);
    fr.forEach((f, i) => writeFileSync(join(dir, `f${String(i).padStart(5, "0")}.jpg`), f.data));
    // For each output frame at 30 fps, the latest screencast frame at or before that moment.
    const index: number[] = [];
    let j = 0;
    for (let k = 0; k * (1 / FPS) <= end - this.mark; k++) {
      const t = this.mark + k / FPS;
      while (j + 1 < fr.length && fr[j + 1].t <= t) j++;
      index.push(j);
    }
    writeFileSync(join(dir, "index.json"), JSON.stringify({ fps: FPS, frames: index, marks: this.marks, duration: index.length / FPS }));
    console.log(`${this.name}: ${index.length} frames (${(index.length / FPS).toFixed(1)}s), ${fr.length} distinct`, this.marks);
  }

  // ---- actions ----
  async hold(ms: number) {
    // Keep painting during holds, so the screencast always has a recent frame.
    await sleep(ms);
  }
  async scrollTo(y: number, ms = 1600) {
    await this.page.evaluate(([y, ms]) => (window as unknown as { __vtScroll: (y: number, ms: number) => Promise<void> }).__vtScroll(y, ms), [y, ms] as const);
  }
  /** Scrolls so the element's top sits `offset` px below the top of the screen. */
  async scrollToEl(el: Locator, offset = 90, ms = 1700) {
    const y = await el.evaluate((n, o) => n.getBoundingClientRect().top + window.scrollY - o, offset);
    await this.scrollTo(y, ms);
  }
  async tap(el: Locator) {
    const box = await el.boundingBox();
    if (!box) throw new Error(`${this.name}: nothing to tap`);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const dot = (state: string) => this.page.evaluate(([x, y, s]) => (window as unknown as { __vtDot: (x: number, y: number, s: string) => void }).__vtDot(x as number, y as number, s as string), [x, y, state] as const);
    await dot("on");
    await sleep(380);
    await dot("press");
    await el.tap();
    await sleep(260);
    await dot("off");
  }
}

const browser = await chromium.launch({ args: ["--force-device-scale-factor=2"] });

async function open(url: string, clock?: string, storageState?: string) {
  const ctx = await browser.newContext({
    storageState,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    locale: "en-GB",
    timezoneId: "Europe/London",
    reducedMotion: "no-preference",
  });
  await ctx.addInitScript(TOUCH_UI);
  const page = await ctx.newPage();
  if (clock) await page.clock.setFixedTime(new Date(clock));
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  return page;
}

const clips: Record<string, () => Promise<void>> = {
  /** Scene 2 and 6: the Matches page as it stood at noon on 1 Nov, then the Racing v Real Madrid card. */
  async matches() {
    const page = await open(REPLAY + "/", REPLAY_AT);
    const card = page.locator("article", { hasText: "Real Madrid" }).first();
    await card.waitFor({ timeout: 120_000 });
    await sleep(1500);
    const c = new Clip("matches", page);
    await c.start();
    await c.hold(1800);
    c.at("chip");
    await c.tap(page.getByRole("button", { name: /^La Liga/ }).first());
    await c.hold(900);
    await c.scrollToEl(card, 150, 1800);
    c.at("bars");
    await c.hold(5200);
    c.at("open");
    await c.tap(card.getByRole("button", { name: /Make your call/ }));
    await page.getByText(/Walrus brought back|Remembered on Walrus|games like this/i).first().waitFor({ timeout: 60_000 }).catch(() => {});
    await c.hold(1200);
    await c.scrollToEl(card, 20, 1900);
    c.at("record");
    await c.hold(4200);
    await c.scrollTo(await page.evaluate(() => window.scrollY + 330), 2200);
    c.at("recalled");
    await c.hold(4200);
    await c.stop();
  },

  /** Scene 3: the stamp, as listed on Proof at noon on 1 Nov, checked live on Sui, then on Suiscan. */
  async stamp() {
    const page = await open(REPLAY + "/proof", REPLAY_AT);
    const stamped = page.getByText("Stamped on Sui", { exact: true });
    await stamped.waitFor({ timeout: 120_000 });
    const row = page.locator("li, div", { hasText: /Odds before kickoff: Real Racing Club de Santander v Real Madrid/ }).filter({ has: page.getByRole("button", { name: "Check" }) }).last();
    await row.waitFor({ timeout: 30_000 });
    // Warm up the check endpoint (the dev server compiles it on first use), so the on-screen check is quick.
    await page.evaluate(() => fetch("/api/check-stamp?digest=x&ref=y").catch(() => {}));
    await sleep(1200);
    const c = new Clip("stamp", page);
    await c.start();
    await c.hold(600);
    await c.scrollToEl(stamped, 80, 1900);
    c.at("list");
    await c.hold(2600);
    c.at("check");
    await c.tap(row.getByRole("button", { name: "Check" }));
    await page.getByText("Matches what we saved").waitFor({ timeout: 90_000 });
    c.at("result");
    await c.hold(1000);
    await c.scrollToEl(page.getByText("Matches what we saved"), 260, 1200);
    await c.hold(4200);
    c.at("suiscan");
    await c.stop();
  },

  /** Scene 3, second half: the transaction on Suiscan. */
  async suiscan() {
    const page = await open("https://suiscan.xyz/mainnet/tx/46XxatkKHrhbFmQQrJk5aF1aNNLYcyVWS8JkGgaWH84a");
    await sleep(5000);
    const c = new Clip("suiscan", page);
    await c.start();
    await c.hold(2500);
    await c.scrollTo(260, 2000);
    await c.hold(4000);
    await c.stop();
  },

  /** Scene 4: last week's results on the live site, down to Racing 0-3 Real Madrid. */
  async results() {
    const page = await open(LIVE + "/");
    const head = page.getByRole("heading", { name: "Last week's results" });
    await head.waitFor({ timeout: 120_000 });
    const row = page.locator("li", { hasText: "Real Racing Club de Santander" }).first();
    await sleep(1500);
    const c = new Clip("results", page);
    await c.start();
    await c.hold(700);
    await c.scrollToEl(head, 70, 2600);
    c.at("summary");
    await c.hold(3000);
    await c.scrollToEl(row, 260, 2600);
    c.at("row");
    await c.hold(4500);
    await c.stop();
  },

  /** Scene 4, second half: the Walrus memory count and list on the live Proof page. */
  async memories() {
    const page = await open(LIVE + "/proof");
    const count = page.getByText("Walrus memories", { exact: true });
    await count.waitFor({ timeout: 120_000 });
    await sleep(1500);
    const c = new Clip("memories", page);
    await c.start();
    await c.hold(600);
    await c.scrollToEl(count, 330, 1800);
    c.at("count");
    await c.hold(3200);
    await c.scrollToEl(page.getByText("Remembered on Walrus", { exact: true }), 70, 2000);
    c.at("list");
    await c.hold(3800);
    await c.stop();
  },

  /** Scene 5: the record on the live Records page, counting up, then the gap filter. */
  async records() {
    const page = await open(LIVE + "/records");
    await page.getByText("All graded games").waitFor({ timeout: 120_000 });
    // Reload so the numbers roll in while recording.
    const c = new Clip("records", page);
    await c.start();
    await page.reload({ waitUntil: "domcontentloaded" });
    c.at("load");
    await page.getByText("All graded games").waitFor({ timeout: 120_000 });
    await c.hold(5200);
    c.at("close");
    await c.tap(page.getByRole("tab").nth(1));
    await c.hold(3600);
    await c.scrollToEl(page.getByRole("heading", { name: "By league" }), 70, 2200);
    c.at("leagues");
    await c.hold(4200);
    await c.stop();
  },

  /** Scene 7 (signed in as the judge account, session from judge-login.mts): a real call, stamped on Sui. */
  async calllive() {
    const page = await open(LIVE + "/", undefined, join(import.meta.dirname, "build", "judge-state.json"));
    const first = page.locator("article", { has: page.getByRole("button", { name: /Make your call/ }) }).first();
    await first.waitFor({ timeout: 120_000 });
    // Pin the card to its game, so it stays the same card after it opens.
    const home = (await first.innerText()).split(/\r?\n/)[0].trim();
    const card = page.locator("article", { hasText: home }).first();
    await sleep(1500);
    const c = new Clip("calllive", page);
    await c.start();
    await c.hold(900);
    await c.scrollToEl(card, 150, 1500);
    await c.tap(card.getByRole("button", { name: /Make your call/ }));
    await c.hold(1400);
    c.at("pick");
    await c.tap(card.getByRole("button", { name: / win$/ }).first());
    await page.getByText(/Stamping on Sui/i).first().waitFor({ timeout: 15_000 }).catch(() => {});
    c.at("stamping");
    await page.getByText(/Stamped/).first().waitFor({ timeout: 60_000 });
    c.at("stamped");
    await c.hold(1200);
    const sui = page.getByRole("link", { name: /View on Sui|Sui/ }).first();
    if (await sui.count()) await c.scrollToEl(sui, 420, 1200);
    await c.hold(5000);
    await c.stop();
  },

  /** Scene 7 (signed out): a pick on a real upcoming game asks you to sign in to lock it. */
  async call() {
    const page = await open(LIVE + "/");
    const card = page.locator("article").first();
    await card.waitFor({ timeout: 120_000 });
    await sleep(1500);
    const c = new Clip("call", page);
    await c.start();
    await c.hold(900);
    await c.scrollToEl(card, 150, 1500);
    await c.tap(card.getByRole("button", { name: /Make your call/ }));
    await c.hold(1100);
    c.at("pick");
    await c.tap(card.getByRole("button", { name: / win$/ }).first());
    await c.hold(4500);
    await c.stop();
  },
};

const want = process.argv.slice(2);
for (const [name, run] of Object.entries(clips)) {
  if (want.length && !want.includes(name)) continue;
  try {
    await run();
  } catch (e) {
    console.error(`${name} failed:`, e instanceof Error ? e.message : e);
  }
}
await browser.close();
