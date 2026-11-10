// Creates the judge test account: a normal user (no admin rights), rate-limited like everyone else.
// The password is random and goes straight into .env.local (never printed). Copy it from there into the README.
// Safe to run again: if JUDGE_PASSWORD is already set, it does nothing.
// Run: npx tsx scripts/create-judge-user.mts
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createAdminClient } from "../src/lib/supabase/admin";

const ENV_FILE = ".env.local";
process.loadEnvFile(ENV_FILE);
const email = "judges@vernier-odds.test";

if (process.env.JUDGE_PASSWORD) {
  console.log(`Judge account already set up: ${email}. Password is in .env.local (JUDGE_PASSWORD).`);
  process.exit(0);
}
// Easy to type: three short words of letters and digits.
const password = `vernier-${randomBytes(4).toString("hex")}-${randomBytes(4).toString("hex")}`;
const { error } = await createAdminClient().auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw new Error(`Couldn't create the judge account: ${error.message}`);
writeFileSync(
  ENV_FILE,
  `${readFileSync(ENV_FILE, "utf8").trimEnd()}\n\n# Judge test account, also shown in the README (scripts/create-judge-user.mts)\nJUDGE_EMAIL=${email}\nJUDGE_PASSWORD=${password}\n`,
);
console.log(`Created judge account ${email}. Password saved in .env.local as JUDGE_PASSWORD.`);
