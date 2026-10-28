// Creates the app's test account for checking "Your call" on localhost.
// The password is random and goes straight into .env.local (never printed). Safe to run again: it reuses the account.
// Run: npx tsx scripts/create-test-user.mts
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createAdminClient } from "../src/lib/supabase/admin";

const ENV_FILE = ".env.local";
process.loadEnvFile(ENV_FILE);
const email = "yourcall-test@total-recall.test";

if (process.env.TEST_USER_PASSWORD) {
  console.log(`Test account already set up: ${email}`);
  process.exit(0);
}
const password = randomBytes(18).toString("base64url");
const { error } = await createAdminClient().auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw new Error(`Couldn't create the test account: ${error.message}`);
writeFileSync(ENV_FILE, `${readFileSync(ENV_FILE, "utf8").trimEnd()}\n\n# Test account for localhost checks (scripts/create-test-user.mts)\nTEST_USER_EMAIL=${email}\nTEST_USER_PASSWORD=${password}\n`);
console.log(`Created test account ${email}. Password saved in .env.local.`);
