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
| Users log picks before events | One-tap pick before kickoff, stamped on Sui, scored afterwards |
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
5. **"Who to trust" view.** For each upcoming match: each source's chance, the gap, and the memory-based note, e.g.
   > "Bookies: Arsenal 55%. Polymarket: 68%. In 20 Premier League matches where they disagreed by 10+ points, Polymarket was closer 14 times."
   Show the sample size every time. If there isn't enough history, say so plainly.
6. **One-tap user pick.** Sign in, pick Home/Draw/Away before kickoff, optional confidence. Stamped on Sui, graded, scored against the sources. Personal note over time, e.g. "When you went against Polymarket, you were right 3 of 11 times."
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
- **One app wallet, server-side.** The app holds one funded Sui keypair in `.env` and pays gas for every stamp via Tatum. Users never need a wallet or SUI. Add a low-balance warning for the owner and a per-user daily limit on picks. Explain this honestly in the README.
- **Every edit to a user pick before kickoff gets its own Sui stamp.** Keep full version history. Picks lock at kickoff.
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
4. "Who to trust" view with recalled memories and sample sizes.
5. One-tap user picks (sign-in, stamp, grade); scorecard page.
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
- Sign-up (Google or email, via Supabase) is only needed to make picks.
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
- User pick journal: sign-in, new pick, edits saved as versions, full history, kickoff lock enforced by the database, content hash per version. This becomes feature 6 (one-tap user pick). It still needs slimming down: pick + optional confidence only.
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
- Still to confirm with live keys: The Odds API returns h2h odds with a draw for each league (checked on its docs page only so far), and the Polymarket numbers through Tatum match the public figures above (checked on Polymarket's public API so far).
