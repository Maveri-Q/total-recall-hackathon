// One-time: publishes the Move module (move/sources/stamp.move) to Sui Mainnet through Tatum,
// paid for by the app wallet, then saves the new package id in .env.local.
//
// First build the bytecode with the Sui CLI:
//   sui move build --path move --dump-bytecode-as-base64 > move/bytecode.json
// Then run: npx tsx scripts/publish-move.mts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { explorerTxUrl } from "../src/lib/sui-stamp";
import { getAppBalance, publishPackage } from "../src/lib/tatum";

const ENV_FILE = ".env.local";
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const env = readFileSync(ENV_FILE, "utf8");
const existing = /^SUI_PACKAGE_ID=(0x[0-9a-f]{64})\s*$/m.exec(env)?.[1];
if (existing) {
  console.log(`Already published: ${existing}. Not publishing again.`);
  process.exit(0);
}

// The CLI may print build notes before the JSON. Take the JSON object at the end.
const raw = readFileSync("move/bytecode.json", "utf8").replace(/^﻿/, "");
const { modules, dependencies } = JSON.parse(raw.slice(raw.indexOf("{"))) as { modules: string[]; dependencies: string[] };

const { address, mist } = await getAppBalance();
console.log(`App wallet ${address} has ${Number(mist) / 1e9} SUI.`);
if (mist === 0n) throw new Error("The app wallet has no SUI yet. Send some to the address above first.");

const { packageId, digest } = await publishPackage(modules, dependencies);
writeFileSync(ENV_FILE, env.replace(/^SUI_PACKAGE_ID=.*$/m, `SUI_PACKAGE_ID=${packageId}`));
console.log(`Published. Package id: ${packageId} (saved in .env.local)`);
console.log(`Transaction: ${explorerTxUrl(digest)}`);
