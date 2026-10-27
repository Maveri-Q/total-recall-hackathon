// One-time: creates the app's Sui wallet and saves its private key straight into .env.local.
// The private key is never printed. Only the public address is shown, so you can send SUI to it.
// Run: npx tsx scripts/create-app-wallet.mts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const ENV_FILE = ".env.local";
if (!existsSync(ENV_FILE)) throw new Error(".env.local not found. Run this from the project folder.");

const env = readFileSync(ENV_FILE, "utf8");
const current = /^SUI_APP_PRIVATE_KEY=(.*)$/m.exec(env)?.[1]?.trim() ?? "";
if (current && !current.includes("your-")) {
  const address = Ed25519Keypair.fromSecretKey(current).toSuiAddress();
  console.log(`An app wallet already exists. Not replacing it.\nAddress: ${address}`);
  process.exit(0);
}

const keypair = new Ed25519Keypair();
const line = `SUI_APP_PRIVATE_KEY=${keypair.getSecretKey()}`;
const updated = /^SUI_APP_PRIVATE_KEY=.*$/m.test(env)
  ? env.replace(/^SUI_APP_PRIVATE_KEY=.*$/m, line)
  : `${env.trimEnd()}\n${line}\n`;
writeFileSync(ENV_FILE, updated);

console.log("Created the app wallet and saved its private key in .env.local.");
console.log(`Address (safe to share): ${keypair.toSuiAddress()}`);
