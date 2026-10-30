// Exports the PNG versions of the Vernier logo from the SVGs in brand/ (no redrawing):
//   - src/app/apple-icon.png (180px) and the web app manifest icons (192 and 512px)
//   - src/app/opengraph-image.png: the social preview, 1200x630
//   - brand/vernier-banner.png: the README banner, 1280x400
// The previews use the big wordmark from UI.md: Archivo 800, the "i" dot is a small lime bar, like a scale mark.
// Run: npx tsx scripts/export-brand-pngs.tsx
import { readFileSync, writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { APP_TAGLINE, WORDMARK } from "../src/lib/brand";

const ICON = "brand/vernier-icon.svg";

// Google Fonts serves .ttf files to an old user agent, which the image renderer needs.
async function font(family: string, weight: number): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, { headers: { "User-Agent": "Mozilla/4.0" } })).text();
  const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error(`No .ttf for ${family} ${weight}`);
  return (await fetch(url)).arrayBuffer();
}
const iconSrc = `data:image/svg+xml;base64,${readFileSync(ICON).toString("base64")}`;

/** "vernier" with a lime bar for the dot on the "i" (a dotless ı underneath). */
function Wordmark({ size }: { size: number }) {
  const [before, after] = WORDMARK.split("i", 2);
  return (
    <div style={{ display: "flex", fontFamily: "Archivo", fontWeight: 800, fontSize: size, letterSpacing: "-0.045em", lineHeight: 1, color: "#F2F5F1" }}>
      <span>{before}</span>
      <span style={{ display: "flex", position: "relative" }}>
        ı
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: size * 0.02,
            width: size * 0.13,
            height: size * 0.26,
            marginLeft: -size * 0.065,
            borderRadius: size * 0.03,
            background: "#C6F36B",
          }}
        />
      </span>
      <span>{after}</span>
    </div>
  );
}

function Card({ width, height, icon, word, tagline }: { width: number; height: number; icon: number; word: number; tagline: number }) {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: icon * 0.3,
        background: "radial-gradient(90% 70% at 25% 30%, #143528 0%, #0A1712 70%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not a page */}
      <img src={iconSrc} width={icon} height={icon} alt="" />
      <div style={{ display: "flex", flexDirection: "column", gap: word * 0.16 }}>
        <Wordmark size={word} />
        <span style={{ fontFamily: "Schibsted Grotesk", fontWeight: 500, fontSize: tagline, color: "#C9D6CE" }}>{APP_TAGLINE}</span>
      </div>
    </div>
  );
}

// A function rather than top-level await: tsx runs .tsx scripts as CommonJS.
async function main() {
  await sharp(ICON, { density: 300 }).resize(180, 180).png().toFile("src/app/apple-icon.png");
  await sharp(ICON, { density: 300 }).resize(192, 192).png().toFile("public/brand/vernier-icon-192.png");
  await sharp(ICON, { density: 300 }).resize(512, 512).png().toFile("public/brand/vernier-icon-512.png");

  const fonts = [
    { name: "Archivo", data: await font("Archivo", 800), weight: 800 as const },
    { name: "Schibsted Grotesk", data: await font("Schibsted+Grotesk", 500), weight: 500 as const },
  ];
  const save = async (path: string, el: React.ReactElement, width: number, height: number) => {
    writeFileSync(path, Buffer.from(await new ImageResponse(el, { width, height, fonts }).arrayBuffer()));
  };
  await save("src/app/opengraph-image.png", <Card width={1200} height={630} icon={240} word={150} tagline={30} />, 1200, 630);
  await save("brand/vernier-banner.png", <Card width={1280} height={400} icon={190} word={120} tagline={26} />, 1280, 400);
  console.log("Exported apple-icon, 192/512 manifest icons, the social preview and the README banner.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
