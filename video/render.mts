// Renders the demo video: steps stage.html through every frame at 30 fps, pipes the frames into ffmpeg,
// then mixes the voice, music and sound effects and joins them into vernier-demo.mp4.
//
// Run:  npx tsx video/render.mts            full render
//       npx tsx video/render.mts --stills 3 30 61   PNG stills at those seconds, to check the layout
//       npx tsx video/render.mts --audio-only       remix the soundtrack onto the last video render
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const HERE = import.meta.dirname;
const BUILD = join(HERE, "build");
const FFMPEG =
  process.env.FFMPEG ??
  "C:/Users/admin/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
const FPS = 30;
const OUT = join(HERE, "..", "vernier-demo.mp4");

const args = process.argv.slice(2);
// VOICE_DIR=voice-11 uses the ElevenLabs voice (voice_eleven.py); the default is the free Edge voice (voice.py).
const VOICE_DIR = process.env.VOICE_DIR ?? (existsSync(join(BUILD, "voice-11", "timings.json")) ? "voice-11" : "voice");
const timings = JSON.parse(readFileSync(join(BUILD, VOICE_DIR, "timings.json"), "utf8"));
const clips: Record<string, unknown> = {};
for (const name of readdirSync(join(BUILD, "clips"))) clips[name] = JSON.parse(readFileSync(join(BUILD, "clips", name, "index.json"), "utf8"));
const tests = Number(process.env.TESTS ?? 0) || undefined;

function run(cmd: string, a: string[], input?: NodeJS.ReadableStream) {
  return new Promise<void>((ok, fail) => {
    const p = spawn(cmd, a, { stdio: ["pipe", "inherit", "inherit"] });
    p.on("exit", (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}`))));
    if (input) input.pipe(p.stdin);
    else p.stdin.end();
  });
}

/** What stage.html puts on window. */
type Stage = {
  boot(d: unknown): number;
  seek(t: number): Promise<void>;
  AUDIO: { file: string; at: number; vol: number; kind: string }[];
  SECTIONS: { total: number; start: Record<string, number> };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(HERE, "stage.html")).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const total: number = await page.evaluate((d) => (window as unknown as Stage).boot(d), { timings, clips, tests });
const audio: { file: string; at: number; vol: number; kind: string }[] = await page.evaluate(() => (window as unknown as Stage).AUDIO);
const frames = Math.round(total * FPS);
console.log(`Voice ${VOICE_DIR}. Length ${total.toFixed(1)}s, ${frames} frames`);
// The music follows the scene times, so it is made after the stage has worked them out.
writeFileSync(join(BUILD, "sections.json"), JSON.stringify(await page.evaluate(() => (window as unknown as Stage).SECTIONS)));

const seek = (t: number) => page.evaluate((tt) => (window as unknown as Stage).seek(tt), t);

if (args[0] === "--stills") {
  mkdirSync(join(BUILD, "stills"), { recursive: true });
  for (const s of args.slice(1).map(Number)) {
    await seek(s);
    await page.screenshot({ path: join(BUILD, "stills", `t${String(s).padStart(6, "0")}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const silent = join(BUILD, "video-only.mp4");
if (args[0] !== "--audio-only") {
  // Frames go straight into ffmpeg as JPEGs. A pass-through stream with backpressure keeps memory flat.
  const { PassThrough } = await import("node:stream");
  const pipe = new PassThrough({ highWaterMark: 1 << 24 });
  const enc = run(
    FFMPEG,
    ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
     "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", silent],
    pipe,
  );
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await seek(f / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!pipe.write(buf)) await new Promise((r) => pipe.once("drain", r));
    if (f % 150 === 0) console.log(`frame ${f}/${frames}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  pipe.end();
  await enc;
}
await browser.close();

// ---- soundtrack ----
await run("python", [join(HERE, "sound.py")]);
// Voice on top. Music quiet, and ducked further while the voice speaks. Effects soft.
const fx = (n: string) => join(BUILD, "audio", `${n}.wav`);
const inputs: string[] = ["-i", fx("music")];
const parts: string[] = [];
const voice: string[] = [];
const sfx: string[] = [];
audio.forEach((a, i) => {
  const file = a.kind === "voice" ? a.file : fx(a.file);
  if (!existsSync(file)) throw new Error(`missing ${file}`);
  inputs.push("-i", file);
  const ms = Math.max(0, Math.round(a.at * 1000));
  const label = `a${i}`;
  parts.push(`[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${a.vol},adelay=${ms}|${ms}[${label}]`);
  (a.kind === "voice" ? voice : sfx).push(`[${label}]`);
});
const filter = [
  ...parts,
  `${voice.join("")}amix=inputs=${voice.length}:normalize=0,highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,apad,asplit=2[vox][key]`,
  `${sfx.join("")}amix=inputs=${sfx.length}:normalize=0,volume=0.55[fx]`,
  `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.22,afade=t=out:st=${(total - 3).toFixed(2)}:d=3[mus]`,
  `[mus][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=600[duck]`,
  `[duck][vox][fx]amix=inputs=3:normalize=0,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]`,
].join(";");
writeFileSync(join(BUILD, "audio-filter.txt"), filter);
const mix = join(BUILD, "soundtrack.wav");
await run(FFMPEG, ["-y", "-loglevel", "error", ...inputs, "-/filter_complex", join(BUILD, "audio-filter.txt"), "-map", "[out]", "-ar", "48000", mix]);
await run(FFMPEG, ["-y", "-loglevel", "error", "-i", silent, "-i", mix, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]);
console.log(`Saved ${OUT}`);
