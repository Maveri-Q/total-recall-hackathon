# Project Brief: Total Recall Hackathon (Tatum × Walrus)

Read this whole file before doing anything. It is the agreed plan. It replaces every earlier version.

## About the person you're working with
- Name: Maverick. First hackathon, beginner coder, Windows laptop.
- Explain things in plain, simple language. Short answers. Explain any technical word in one line the first time you use it.
- Before any step that needs an account, API key, wallet or payment, stop and tell him exactly what to do and why.
- Never ask him to paste private keys, seed phrases or API keys into chat. They go in `.env` only.

## Top priority: it has to work
1. **Meet every hackathon requirement first:** Mainnet Walrus writes, 10+ memories, real Tatum integration, working demo, public repo.
2. **Make it reliable:** test each feature end to end with real Mainnet calls, not mocks. Handle errors without crashing. Write tests for all scoring maths and the main data job.
3. **Only then work on looks.** Plain, clean layout until everything works. No animations, fancy styling or extra features while any core flow is unfinished or untested.
4. What makes this product stand out is the memory-based source scoring working on real matches, not the visuals.

A feature is "done" only when it has run for real on Mainnet and its tests pass.

## Hackathon facts (re-check the official page before submitting)
- Event: Total Recall, Tatum × Walrus Memory Hackathon. Online.
- Deadline: **10 Nov 2026, 17:00 UTC**. Aim to submit by 9 Nov.
- Track: **Track 1, Markets & Sports Prediction.**
  Brief: "Build a prediction app for sports, elections, culture, or markets. Compare bookmaker odds with onchain sources. Track which voices were right. Users log picks before events. Memory stores credibility scores so the app learns who to trust."
- Required:
  1. Walrus Memory integrated and writing on **Mainnet**
  2. **At least 10 memories** stored on Mainnet
  3. Tatum RPC used for onchain data
  4. Published blog post: what it does, how it uses Tatum + Walrus, how it learned over time
  5. Working demo + **public GitHub repo**
  6. 2–3 minute demo video
- Submission form also needs: Tatum account ID, Sui address, MEMWAL_AGENT_ID.
- Judging: Walrus + Tatum integration 30% · Technical quality (clean code, Tatum Sui RPC) 30% · Creativity 20% · Presentation (docs + working demo) 20%.

## The product (name TBD)
**An odds watchdog for football that learns which source to trust.**

The problem it solves: a bettor sees one bookie's odds and has no way to know if the price is fair. Polymarket, where people trade real money on the same match, often gives a different chance. Nobody shows when the two disagree, or which one is usually right.

What the app does, with no effort from the user:
1. Before each big match, it pulls bookmaker odds and Polymarket's price.
2. It shows the chance each source gives, and flags big gaps.
3. It stamps a record of that reading on Sui before kickoff, so the app's own history can't be edited after the result.
4. After the match, it checks which source was closer.
5. Walrus Memory keeps every reading, result and score, and builds a track record for each source (by league and by size of disagreement).
6. Next time the sources disagree, the app recalls similar past cases and says which source has been more reliable, with the sample size.

Users can also make their own pick in one tap. It gets stamped and scored against the bookies and Polymarket.

Core demo story:
**Read the odds → stamp them on Sui → grade the result → remember it in Walrus → use that memory to say who to trust next time.**

In one line: *It compares the bookies with Polymarket before every match, remembers which one turned out right, and tells you who to trust next time.*

It is NOT a betting platform. No bets, no stakes, no payouts, no tips sold. It shows evidence, not sure wins.

## How it meets each part of the Track 1 brief
| Brief line | What we build |
|---|---|
| Compare bookmaker odds with onchain sources | Bookie odds vs Polymarket price for the same match, side by side |
| Track which voices were right | Every source (and every user who picks) graded after every match |
| Memory stores credibility scores so the app learns who to trust | Walrus holds each source's record; recalled memories change what the app tells you |
| Users log picks before events | "Your call" before kickoff, stamped on Sui, scored afterwards |
Keep this table true. If a build decision would break a row, stop and tell Maverick.

## Features in priority order
1. **Data job (most important, start first).** Runs **every day**, not just weekends, so weekday matches (midweek league games, Champions League, Europa League) are covered too. For each upcoming match in the chosen leagues, on any day of the week:
   - Fetch bookmaker 1X2 odds (home/draw/away) from an odds data service.
   - Fetch Polymarket prices for the same match through the **Tatum Prediction Markets API** (`https://api.tatum.io/v4/data/prediction`).
   - Match events across sources carefully (same teams, same date). If unsure, don't match. Never guess.
   - Only use Polymarket markets above a minimum traded volume (set a sensible threshold and document it) so thin markets don't distort results.
   - Save the snapshot with the exact fetch time and source.
2. **Proof on Sui.** Hash each pre-kickoff snapshot and record the hash on Sui Mainnet via Tatum. Show the transaction digest and an explorer link. Only the hash and minimal metadata go onchain.
3. **Grading.** After full time, fetch the result from a football results source (e.g. football-data.org, verify limits). Score each source's probabilities with a proper scoring rule (Brier score) and record which was closer.
4. **Walrus Memory.** Store snapshots, results, per-match scores and source records as memories. Recall relevant past cases for each upcoming match (same league, similar gap size, same teams). **Show the recalled memories in the UI** so it's visible that Walrus is doing real work.
5. **"Coming up" page (the main page, agreed 28 Oct 2026).** Page title: "Coming up". Each match shows:
   ```
   Roma vs Cagliari · 8:45pm
   Bookies: Roma 58% · Polymarket: Roma 66%
   Bookies vs Polymarket: 5 – 9
   in 14 Serie A games where they disagreed this much
   ```
   - The scoreline is between the two sources, not the teams. Don't use "head to head": fans read that as the teams' history.
   - The score comes from Walrus recall: past matches in the same league with a similar gap, counting which source was closer (Brier score). The counting is done in code from our own data; Walrus picks which past games are similar.
   - Fewer than 10 similar past games: "Not enough games like this yet. We'll show the score once we have 10."
   - No Polymarket market: "No Polymarket market for this game." Never leave it blank.
   - A small ⓘ icon opens a short explanation:
     - Next to Polymarket: "Polymarket is a site where people put real money on what will happen. Its price shows the chance they give each result."
     - Next to the bookies' %: "We turn the bookies' odds into a chance, so you can compare them with Polymarket."
     - Next to the scoreline: "After every game, we check who got closer to the real result. This is the score so far in games like this one."
   - Keep all text casual and short, like a fan talking to a friend.
6. **"Your call" (agreed 28 Oct 2026).** On each match on Coming up: "Your call:" with three buttons named after the teams ("Roma win", "Draw", "Cagliari win"). Sign in needed. Each call and each change before kickoff is stamped on Sui. After the game: "You called it" or "Not this time". The history page is called **"Your calls"**. Personal note over time, e.g. "When you went against Polymarket, you were right 3 of 11 times."
7. **Source scorecard page.** Each source's record by league, with sample sizes. Users' records too.
8. **Stretch only (if everything above works and is tested):** tipster check from pasted text; Enoki sign-in + sponsored gas; share card for correct picks.

## Maths rules
- All counting and scoring happens in the database/code, deterministic and reproducible. Walrus stores and recalls; it does not do the maths.
- Convert decimal odds to chance: 1 ÷ odds. Remove the bookmaker margin by normalising the three chances to sum to 100%. Document this.
- Polymarket: use the price of each outcome's market; normalise if the three don't sum to 100%. Document this.
- Use the Brier score for "who was closer". Write unit tests with hand-checked examples.
- An LLM may only *explain* numbers in words. It never decides them.

## Agreed decisions (don't change without asking Maverick)
- **Football only.** Start with the Premier League; add La Liga, Serie A, Bundesliga and Champions League if Polymarket covers them with enough volume.
- **Database does the counting, Walrus does the remembering.** Every snapshot, result, score and pattern is also saved to Walrus, and Walrus recall is shown in the app.
- **One app wallet, server-side.** The app holds one funded Sui keypair in `.env` and pays gas for every stamp via Tatum. Users never need a wallet or SUI. Add a low-balance warning for the owner and a per-user daily limit on calls. Explain this honestly in the README.
- **Every change to a call before kickoff gets its own Sui stamp.** Keep full version history. Calls lock at kickoff.
- **Supabase** for both database and sign-in. Sign-in options: **Google** and **email** (magic link or password). Both must be tested end to end on the live site: new account, sign in, sign out, sign back in, and a user who first used email then tries Google with the same address. Google needs a free OAuth setup in Google Cloud Console; walk Maverick through it step by step. Skip Apple (needs a paid $99/year developer account). Other providers only if time allows.
- **Enoki (zkLogin + sponsored gas) is on hold.** It's paid ($69+/month for Mainnet). Only revisit if Maverick confirms free hackathon credits.
- **Tipster check:** pasted text only, and stretch priority.
- **No scraping** of bookmaker sites (SportyBet, Bet9ja etc.) or X. Use official APIs only.
- **No prizes or payouts.** No budget for it, and it would blur the "not betting" line.
- **No Tatum AI Builder** for the main build.
- **Name:** decided later.

## Honesty rules
- Never fabricate odds, prices, results or records and present them as real.
- If data is missing, show "no Polymarket market for this match" or "odds unavailable". Never blank, never guessed, never matched to the wrong event.
- An onchain timestamp proves when the app recorded something, not that a price was available to every bettor or that a source is trustworthy.
- No single hidden "trust score". Every claim shows its sample size and league.
- Small samples are labelled as early signals.
- No financial advice, no "sure wins", no profit promises.

## Writing style (all app text, README, blog post, demo script)
Write like a football fan explaining something to a friend. People should understand every sentence on first read.

Rules:
- Short sentences. One idea each. Most under 15 words.
- Common words. "Use" not "utilise". "Help" not "facilitate". "Check" not "verify" in user-facing text.
- Active voice. "Polymarket was closer" not "Polymarket was found to be more accurate".
- Put the point first. Lead with the number or the answer.
- Be specific. "Right 14 of 20 times" beats "highly reliable".
- Use the words fans use: odds, bookies, slip, chance, kickoff, full time. Explain anything else once.
- No exclamation marks in normal UI text. No emojis in data screens.
- Avoid em dashes. Use a full stop or a comma.

Never use: unlock, seamless, revolutionise, empower, leverage, harness, elevate, game-changer, cutting-edge, dive into, delve, robust, in today's fast-paced world, journey (for a user flow), "not just X, it's Y", lists of three adjectives, or rhetorical questions in headings.

Examples:
- Bad: "Leverage AI-powered insights to elevate your betting journey."
- Good: "See which odds have been right before you pick."
- Bad: "Our robust verification system ensures complete transparency."
- Good: "Every reading is stamped on Sui before kickoff, so we can't change it later."
- Bad: "Insufficient historical data is available for this fixture."
- Good: "Not enough past matches yet. We need about 10 before showing a pattern."

Show Maverick all user-facing text before it's final. He has the last word.

## Suggested tech (confirm with Maverick before installing)
- Next.js + TypeScript, deployed on Vercel (free).
- Supabase (free tier) for Postgres and email sign-in.
- Scheduled job for the data collector (e.g. Vercel Cron or Supabase scheduled functions; check free-tier limits and pick what's reliable).
- Walrus Memory TypeScript SDK (MemWal). Docs: https://docs.wal.app/walrus-memory · Dashboard: https://memory.walrus.xyz/dashboard
- Sui: a small Move module that records a commitment (hash) and emits an event. Submit via Tatum's Sui gateway (check Tatum docs for current method; Sui has deprecated JSON-RPC, gRPC is preferred): https://docs.tatum.io
- Odds: an odds data service with a free tier (e.g. The Odds API). Verify football coverage and request limits. Fetch once or twice per match only.
- Results: football-data.org or similar. Verify limits.
- Keep all Walrus calls in one module, all Tatum calls in one module, all scoring in one module, so judges can find them.

## Verify first (Day 1, before building on them)
1. Does the free Tatum plan include the Prediction Markets API? Does it return Polymarket football match markets with prices? **If not, stop and tell Maverick before choosing a workaround.**
2. Which leagues have Polymarket match markets with decent volume this weekend.
3. Odds service: football coverage, free request limit, which bookmakers.
4. Results source: coverage and limits.
5. Walrus Memory SDK: how to write and recall, what counts as a memory, `MEMWAL_AGENT_ID` vs `accountId`.
6. Tatum Sui: endpoint, auth, how to submit a transaction. Current gas cost per stamp.

## Build order
Build in this order. Each step builds on the one before. Finish and test a step, then move straight to the next. If things run late, tell Maverick and cut stretch items, never core requirements.
1. Setup, verify the list above, and get the **data job saving real snapshots** (bookie + Polymarket) for upcoming matches.
2. Sui stamp of each snapshot via Tatum, working end to end on Mainnet.
3. Grading after full time; Walrus writes and recall.
4. "Coming up" page with recalled memories and sample sizes.
5. "Your call" (sign-in, stamp, grade) and the "Your calls" page; scorecard page.
6. Fix bugs, test failure cases, README, `.env.example`, blog post draft.
7. Polish UI, record demo, final checks, submit early.

**Hard dates:**
- **Fri 30 Oct:** the data job must be saving real pre-kickoff snapshots, so the 31 Oct–1 Nov matches are captured. If stamping isn't ready yet, save snapshots with fetch times and label them "not stamped". Data can't be collected after the fact, so this comes before everything else.
- **6 Nov:** stamping, grading and user picks working, so the 7–8 Nov matches run fully live.
- Weekday matches count exactly like weekend ones. Users can pick on any day there's a match.

## Security
- `.env` is never committed. Provide `.env.example` with placeholders.
- Secret-bearing calls (Tatum key, odds key, app wallet key, Walrus key) run server-side only.
- Test failure cases: Tatum down, odds API limit hit, no Polymarket market, transaction fails, wallet low, memory write/read fails, match postponed, team names that don't match across sources.

## Old Google Sheet
Maverick may still log personal picks in a Google Sheet as backup. If so, add a simple CSV importer later and label rows "imported" (not stamped before kickoff). This is low priority. The data job is the main data source now.

## New-user experience
- Anyone can browse matches and source records without signing up.
- Sign-up (Google or email, via Supabase) is only needed to make a call.
- From day one, the app shows real odds, Polymarket prices and gaps, even before much history exists.
- Patterns appear only once there's enough history, always with the sample size.

## Project notes (kept up to date as we build)

@AGENTS.md

### Tech in use
- Next.js 16 + TypeScript (App Router, `src/` folder), npm. Next 16 differs from older versions: check `node_modules/next/dist/docs/` before writing Next-specific code. Cache Components is on: pages that read the login or need fresh data call `await connection()` inside a `<Suspense>` boundary.
- Supabase: Postgres + sign-in. Uses the new key names (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`). Email + password works now, with "Confirm email" turned off. Google sign-in still to add.
- Database changes live in `supabase/migrations/` as numbered SQL files. Maverick runs each one in the Supabase SQL Editor.
- Tests: Vitest (`npm test`).
- Where the calls live, so judges can find them:
  - `src/lib/tatum.ts`: every Tatum call (Sui gRPC + Prediction Markets)
  - `src/lib/walrus.ts`: every Walrus Memory call
  - `src/lib/odds.ts`, `src/lib/scoring.ts`: pure maths, fully tested
  - `src/lib/football-data.ts`: fixtures and results from football-data.org
- Tatum Sui: gRPC gateway `https://sui-mainnet-grpc.gateway.tatum.io`, API key sent as `x-api-key` metadata. Tatum's Sui JSON-RPC was switched off in July 2026, so don't use it.
- Walrus Memory SDK: `@mysten-incubation/memwal` (needs delegate key, account ID, relayer server URL).
- "Total Recall" is only a working title until the real name is picked.

### Already built (before the 27 Oct brief change)
- User pick journal: sign-in, new pick, edits saved as versions, full history, kickoff lock enforced by the database, content hash per version. This became feature 6 ("Your call"), 28 Oct 2026.
- Migrations 0001 (predictions + versions) and 0002 (link to football-data.org fixture).

### Checked so far (27 Oct 2026)
- The Odds API free plan: 500 credits a month. One h2h call for one league and one region costs 1 credit and returns every upcoming match in that league. `/sports` and `/events` are free.
- Polymarket has football match events with 3 Yes/No markets (home win, draw, away win). Big matches trade $30k to $1M. Still to check through Tatum once Maverick has a key.
- Tatum free plan: 1M credits a month, 3 requests a second. Not yet confirmed that the Prediction Markets API is included.

### Data job schedule (agreed 27 Oct 2026)
- Runs on **GitHub Actions**, every hour at an odd minute (e.g. :17, GitHub can start busy top-of-hour jobs late). Free for public repos.
- **Bookie odds and Polymarket are always fetched together.** For each league that needs a reading, fetch the bookie odds, then straight away the Polymarket prices for the same matches. Save both fetch times. If they're more than 5 minutes apart, mark the reading "out of sync" and leave it out of scoring.
- Also save each bookmaker's own `last_update` time from The Odds API, since a bookie's price can be older than our fetch.
- **Two readings per match:**
  1. **Day-before reading:** the first run after 06:00 UTC takes a reading for every match kicking off in the next 24 hours.
  2. **Pre-kickoff reading:** a run 2 to 4 hours before kickoff. The 2-hour spread allows for late GitHub runs.
- One Odds API call (1 credit: h2h market, 1 region) returns every upcoming match in a league, so one call covers all matches that need a reading in that run.
- Free calls (`/events`) decide which leagues need a reading, so credits are only spent when a match is due.
- **Budget guard:** read The Odds API's `x-requests-remaining` header after each call. Under 60 credits left this month, skip pre-kickoff readings and keep only day-before readings. Log it so Maverick can see.
- Estimated use (conservative, the 6 leagues below): about **248 of 500 Odds API credits a month** (63 day-before + 185 pre-kickoff). About 480 Polymarket readings a month through Tatum, well under 1M credits.

### Leagues (checked 27 Oct 2026)
Each league must pass three checks: The Odds API covers it, Polymarket has match markets above the volume threshold, and football-data.org's free plan has its results. Codes live in `src/lib/leagues.ts`.

| League | Odds API key | Polymarket series | football-data | Result |
|---|---|---|---|---|
| Premier League | soccer_epl | 10188 | PL | In |
| La Liga | soccer_spain_la_liga | 10193 | PD | In |
| Serie A | soccer_italy_serie_a | 10203 | SA | In |
| Bundesliga | soccer_germany_bundesliga | 10194 | BL1 | In |
| Ligue 1 | soccer_france_ligue_one | 10195 | FL1 | In |
| Champions League | soccer_uefa_champs_league | 10204 | CL | In |
| Europa League | soccer_uefa_europa_league | 10209 | not on free plan | **Dropped** |

- **Polymarket volume threshold: $10,000 traded on the match (all three outcome markets together) at the moment of the reading.** A match under it is saved but marked "thin market" and left out of scoring. In the last 28 days every settled match in these 6 leagues finished above $50,000 (lowest league median: Ligue 1 at about $378k), so $10k before kickoff only filters out the odd quiet game. Revisit once we have our own pre-kickoff readings.
- Polymarket's league series also holds cup games (e.g. Hull vs Brentford sat in the EPL series). Never trust the series alone: only match a Polymarket event to a fixture when both teams and the kickoff date agree.

### Live key checks (27 Oct 2026, all passed)
- **GitHub:** public repo https://github.com/Maveri-Q/total-recall-hackathon, branch `main`.
- **football-data.org:** all 6 leagues return upcoming fixtures and finished scores. Rate limit is shown in the `x-requests-available-minute` header (10 a minute).
- **The Odds API:** all 6 leagues return h2h odds with a Draw price for every match, from about 20 UK bookies (`regions=uk`). Each call returns roughly the next two rounds. 6 credits used in testing, 494 left in October.
- **Tatum Prediction Markets works on the free plan.** Endpoints in use:
  - `GET /search?q=<teams>&limitPerType=10` finds a match event, e.g. "Chelsea FC vs. Manchester United FC" with `marketCount: 3`, `totalVolume` in USD, `closeTime` = kickoff.
  - `GET /events/{id}` returns the event with `markets` as a list of market ids (no outcome names).
  - `GET /markets/{id}/price` returns `{ yes: { price, bid, ask }, no: {...}, timestamp }`.
  - Still to work out while building: which market id is home, draw or away (look for a market details endpoint with the question text). Don't guess from list order.
  - Example, 27 Oct: Chelsea v Man United Yes prices 0.535 / 0.245 / 0.225 (sum 1.005). Bookie sport888 at the same time: 1.83 / 3.75 / 3.8.
- **Team names differ across sources:** "Paris Saint Germain" (Odds API), "PSG" (football-data short name), "Paris Saint-Germain FC" (Polymarket). Matching needs a name-normalising step plus the same kickoff date. Never match on a name guess alone.

### Sui stamping (live on Mainnet, 28 Oct 2026)
- **App wallet:** `0x6d7a28ce3c59ebe4596e2d13ac7872b2ef9a828945bfd6cbad9df8e388f88f3a`. Key only in `.env.local` and the `SUI_APP_PRIVATE_KEY` GitHub secret. Funded with 5.5 SUI.
- **Move package:** `0xa4b3e8ccb8b9331838bb8257c4ec06d3ea7848b67c4cabde3248b7e6df210237` (module `stamp`, event `Stamped`). Publish tx: https://suiscan.xyz/mainnet/tx/3JhanbcmXLivcbQZD4WfMZPTT6DgfUxVuK8ibQMHcWVV
- **First stamp:** 11 readings in one transaction, 11 `Stamped` events, status success. https://suiscan.xyz/mainnet/tx/5cuZ4iPqHRDHPwqad4ggBb7DX7V82kBnj3Gc4kFpnHoC
- **Real costs:** publish about 0.0074 SUI. One stamp transaction of 11 readings: 0.0001 SUI. At this rate a month of stamping costs well under 0.01 SUI.
- Sui CLI 1.81.1 lives in `C:\Users\admin\sui-cli` (outside the project), only needed to rebuild `move/bytecode.json`. On first run it made its own unused wallet in `C:\Users\admin\.sui` whose phrase was shown in chat: never fund it.
- **GitHub's hourly timer runs late and skips.** On 27 Oct the scheduled runs landed at 11:42, 15:54, 20:43 and 00:32 UTC, about every 4 to 5 hours. Pre-kickoff readings still came in for all 3 games that day, but a 1 to 4 hour window can be missed. To fix before the 31 Oct matches.

### Grading (live, 28 Oct 2026)
- Step 6 of the data job. Matches more than 2 hours past kickoff (up to 14 days back) are looked up on football-data.org, one call per league (`src/lib/football-results.ts`). Linked only when both teams and the kickoff agree with exactly one match.
- Uses the 90-minute score (`regularTime` when a game went to extra time). Postponed or cancelled matches are noted in `matches.result_status`, not graded.
- Each reading gets `bookie_brier` and `poly_brier`. `closer` is set only for usable readings. Maths in `src/lib/data-job/grading.ts` + `src/lib/scoring.ts`, tested with hand-worked sums.
- First real grades, 27 Oct Serie A: Polymarket was closer in all 6 readings (3 matches × 2 readings). Very early, tiny sample.
- **On-time trigger:** migration 0004 makes Supabase (pg_cron + pg_net) start the GitHub workflow at :17 every hour, using a fine-grained GitHub token (Actions read/write, this repo only, expires 30 Nov 2026) kept in Supabase Vault as `github_dispatch_token`. GitHub's own timer stays as a backup.

### Walrus Memory (keys checked 28 Oct 2026)
- SDK `@mysten-incubation/memwal@0.1.8` (pinned; needs `@mysten/seal@1.5.0` to match `@mysten/sui@2.36.0`). The SDK is ESM-only, so `src/lib/walrus.ts` imports it on first use.
- Mainnet relayer `https://relayer.memory.walrus.xyz` (Walrus Foundation pays WAL + gas, sees plaintext: public data only). Sign-in on the dashboard was with Google.
- `npx tsx scripts/check-walrus.mts`: health ok (relayer 0.1.0, production), first test memory saved in 29s and recalled. Blob `IHl-i6yLVe48UVLgbWjoYFY3SqP38iRYhW_AfnQq0JA`, downloadable (encrypted, 360 bytes) from the Walrus Mainnet aggregator. Memory owner address `0x7621926d20615240c28ed1c0d6a393530f900e06b95c9cb0544ab56026a746ba`.
- Namespaces: `total-recall` for real memories, `checks` for key tests (don't count tests towards the 10 required).
- **MEMWAL_AGENT_ID for the submission form = the Account ID.** The dashboard labels it "Account ID" and shows the env name `MEMWAL_ACCOUNT_ID` next to it (screenshot, 28 Oct 2026). There's no separate "Agent ID".

### Walrus memories (live, 28 Oct 2026)
- Step 7 of the data job (`src/lib/data-job/remember.ts`, texts in `memories.ts`). Text written to the `memories` table first (migration 0006), then sent 20 per call; each row keeps its Walrus job id and blob id. A memory sent in an earlier run is checked, never resent.
- Namespaces: `readings`, `results` (graded matches), `records` (source record per league + "all leagues", a new one each time the count grows). One vote per match: pre-kickoff reading if usable, else day-before.
- **First run: 16 memories saved on Walrus Mainnet** (11 readings, 3 graded matches, 2 source records). The required 10 is met. A second run queued nothing new.
- Recall check (`npx tsx scripts/recall-demo.mts`): for tonight's AC Milan v Bologna, Walrus returned the 3 past Serie A cases and the Serie A record first.
- GitHub secrets now also include FOOTBALL_DATA_API_KEY, MEMWAL_DELEGATE_KEY, MEMWAL_ACCOUNT_ID.

### Sign-in (tested locally, 28 Oct 2026)
- Google sign-in through Supabase: button on `/login`, server action `signInWithGoogle`, callback `src/app/auth/callback/route.ts`. Google Cloud project "Total Recall", web client "Total Recall web", published (External). Redirect URI `https://eeeamsgqcjfbifgatcze.supabase.co/auth/v1/callback`, JS origin `http://localhost:3000`. Supabase redirect URL `http://localhost:3000/auth/callback`.
- All 4 tests passed on localhost: new Google account; sign out and back in; still logged in after closing the tab; an email-and-password account then "Continue with Google" with the same Gmail was linked onto the same account (now email + google), no duplicate.
- **Still to do when the site goes live:** add the live address in Google Cloud (JS origin) and Supabase (redirect URL), replace the Google client secret once, and repeat the 4 tests on the live site, as the brief asks.

### Your call (tested live, 28 Oct 2026)
- Real call on AC Milan v Bologna, changed twice before kickoff: 3 versions (AC Milan win, Bologna win, Draw), each with its own Sui stamp (kind 2), fingerprints recomputed and matching. Each call is one transaction for about 0.0001 SUI.
- Speed: a fresh gRPC connection to Tatum takes about 2.7s, later requests about 0.3s. The tap now lights up instantly (useOptimistic), the Sui connection opens while the call saves, and the stamp runs in `after()`. Last change: saved in 2.1s, stamped 4.9s after (first call was 10.4s / 6.9s).
- Test account `yourcall-test@total-recall.test` exists (scripts/create-test-user.mts, password only in .env.local). Claude can't read the password back, so logged-in checks are done by Maverick.
