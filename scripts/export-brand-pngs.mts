// Exports PNGs from the brand SVGs as they are (no redrawing): the apple-touch-icon,
// the web app manifest icons, and the social preview image.
// Run: npx tsx scripts/export-brand-pngs.mts
import sharp from "sharp";

const icon = "brand/oddsight-icon.svg";
await sharp(icon, { density: 300 }).resize(180, 180).png().toFile("src/app/apple-icon.png");
await sharp(icon, { density: 300 }).resize(192, 192).png().toFile("public/brand/oddsight-icon-192.png");
await sharp(icon, { density: 300 }).resize(512, 512).png().toFile("public/brand/oddsight-icon-512.png");

// Social preview: the icon centred on the app's dark ground, 1200x630.
const mark = await sharp(icon, { density: 300 }).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#0A1712" } })
  .composite([{ input: mark, gravity: "center" }])
  .png()
  .toFile("src/app/opengraph-image.png");
console.log("Exported apple-icon, 192/512 manifest icons and the social preview image.");
