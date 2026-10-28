// Checks the Walrus Memory keys: relayer health, then saves one test memory on Mainnet and reads it back.
// The test memory goes in its own "checks" namespace so it never mixes with real match memories.
// Run: npx tsx scripts/check-walrus.mts
import { existsSync } from "node:fs";
import { memwal } from "../src/lib/walrus";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const mw = await memwal();
console.log("health:", JSON.stringify(await mw.health()));
console.log("relayer version:", JSON.stringify(await mw.compatibility()));

const text = `Key check from the Total Recall data job at ${new Date().toISOString()}.`;
const started = Date.now();
const saved = await mw.rememberAndWait(text, "checks", { timeoutMs: 120_000 });
console.log(`saved in ${((Date.now() - started) / 1000).toFixed(1)}s:`, JSON.stringify(saved));

const recalled = await mw.recall("Total Recall key check", { namespace: "checks", limit: 3 });
for (const m of recalled.results) console.log(`recalled (distance ${m.distance.toFixed(3)}): ${m.text}  blob ${m.blob_id}`);
