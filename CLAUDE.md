# Project Brief — Total Recall Hackathon (Tatum × Walrus)

Read this whole file before doing anything. It is the agreed plan.

@AGENTS.md

## About the person you're working with
- Name: Maverick. First hackathon, beginner coder, Windows laptop.
- Explain things in plain, simple language. Short answers. No jargon without a one-line explanation.
- Before any step that needs an account, API key, wallet or payment, stop and tell him exactly what to do and why.
- Never ask him to paste private keys, seed phrases or API keys into chat. They go in `.env` only.

## Top priority: functionality first, looks later
1. **Meet every hackathon requirement first** (Mainnet Walrus writes, 10+ memories, real Tatum Sui integration, working demo, public repo).
2. **Make it work reliably:** test each feature end to end, handle errors gracefully, no crashes or broken flows. Write simple tests for scoring maths and the main journey.
3. **Only then polish the design.** Use a clean, plain layout until everything works. No time on animations, fancy styling or extra features while any core flow is unfinished or untested.
4. Uniqueness comes from Memory Check + market comparison working for real, not from visuals.
Before marking any feature done, confirm it works with real Mainnet calls, not just mocked ones.

## Hackathon facts (re-check the official page before submitting)
- Event: Total Recall — Tatum × Walrus Memory Hackathon. Online.
- Deadline: **10 Nov 2026, 17:00 UTC**. Aim to submit by 9 Nov.
- Track: **Track 1 — Markets & Sports Prediction**.
  Brief: "Users log picks before events. Compare bookmaker odds with onchain sources. Track which voices were right. Memory stores credibility scores so the app learns who to trust."
- Required:
  1. Walrus Memory integrated and writing on **Mainnet**
  2. **At least 10 memories** stored on Mainnet
  3. Tatum RPC used for onchain data
  4. Published blog post (what it does, how it uses Tatum + Walrus, how it learned over time)
  5. Working demo + **public GitHub repo**
  6. 2–3 minute demo video
- Submission form also needs: Tatum account ID, Sui address, MEMWAL_AGENT_ID.
- Judging: Walrus + Tatum integration 30% · Technical quality (clean code, Tatum Sui RPC) 30% · Creativity 20% · Presentation (docs + working demo) 20%.

## The product (name TBD — decide later)
A football prediction companion that remembers your past decisions and uses them to give you better feedback before your next pick.

Core story for the demo:
**Record a prediction → stamp proof on Sui → grade the outcome → remember it in Walrus → use that memory to improve the next decision.**

It is NOT a betting platform. No bets, no stakes, no payouts.

## Features (MVP, in priority order)
1. **Prediction journal** — user logs: match, league, kickoff time, pick (Home win / Draw / Away win), confidence %, one-line reason, optional source (e.g. a tipster). Locked at kickoff. Edits create a new version; never silently overwrite.
2. **Proof on Sui** — each prediction's hash is committed on Sui Mainnet via Tatum. Only the hash/minimal data goes onchain. Reasoning and personal data stay off-chain. Show the transaction digest + explorer link in the UI.
3. **Walrus Memory** — store predictions, reasons, outcomes, and computed patterns as memories. Recall relevant ones when a new prediction is made.
4. **Memory Check (the star feature)** — before the user submits, recall relevant history and combine it with market data. Example:
   > "You're 80% sure. Polymarket says 45%. When you've disagreed with the market by this much before, you were right 2 of 9 times."
   Only show a pattern when the data supports it. If history is too thin, say so plainly.
5. **Market comparison** — bookmaker implied probability (100 ÷ decimal odds) vs onchain market price from **Tatum Prediction Markets API** (Polymarket/Kalshi, base URL `https://api.tatum.io/v4/data/prediction`). Only compare genuinely matching events/outcomes. Show source + timestamp.
   - **Bookmaker odds:** get them from an odds data service (e.g. The Odds API, free tier — verify football coverage and limits). Do NOT scrape SportyBet/Bet9ja or other bookie sites. Save odds once per match (at prediction time) to stay within free limits.
   - **Polymarket won't have a market for every match.** When there's no matching market, show bookmaker odds only with a clear note ("No Polymarket market for this match"). Never leave it blank, guess, or match to a different event.
   - If neither source has odds, say so and still let the user save the prediction.
6. **Grading + scorecard** — after the match, grade from a football results source (or clearly marked manual confirmation). Show settled picks, wins/losses, sample size, accuracy by confidence band (only if enough data).
7. **Tipster check (small)** — user pastes text of someone's prediction. App extracts match/pick/odds, user confirms, it's saved with evidence labels. Records build going forward only. (Screenshots only if time is left at the end.)

## Agreed decisions (don't change without asking Maverick)
- **Football only** (Premier League, La Liga, other big leagues).
- **One app wallet, server-side.** The app holds one funded Sui keypair in `.env` and pays gas to stamp every user's prediction via Tatum. Users never need a wallet or SUI. Document this trade-off honestly in the README.
- **Embedded wallet + sponsored gas = postponed.** Only attempt if everything else is done and tested.
- **No automatic tipster history scraping** (X API is paid, scraping breaks terms, deleted posts can't be recovered).
- **No Tatum AI Builder** for the main build.
- A labelled **"Claude (AI)"** demo profile and a **"Market Favourite"** baseline may exist. Never present AI/sample profiles as real humans.

### Decided 26 Oct 2026
- **Database counts, Walrus remembers.** All counting and scoring (win rates, "right 2 of 9 times", confidence bands) is done in the database with deterministic code. Walrus stores every pick, result and pattern, and recalls related past picks and reasons.
- **Show the recalled memories in Memory Check.** The user should see which Walrus memories were recalled, so it's clear Walrus is doing real work.
- **Every edit before kickoff gets its own Sui stamp.** Keep the full version history (v1, v2, ...), each with its own hash and transaction digest.
- **MEMWAL_AGENT_ID:** the SDK calls this `accountId`. Probably the same thing; confirm on the Walrus Memory dashboard.
- **Supabase** for both the database (Postgres) and email login. No Neon.
- **Tipster check: pasted text only.** Screenshot reading only if time is left at the end.
- **Product name:** decide later.

## Honesty rules (important)
- Never fabricate predictions, odds, results or tipster records and present them as real.
- Label sample/imported data clearly. Predictions imported from the Google Sheet are "imported", not "locked onchain before kickoff".
- An onchain timestamp proves when our app recorded something — not that the original social post was published then, or that its content is true.
- No single hidden "trust score". Show sample size and limits.
- No financial advice or guaranteed outcomes.
- Credibility/scoring maths must be deterministic and reproducible. An LLM may *explain* numbers, never *decide* them.

## Tech (agreed)
- Next.js 16 + TypeScript (App Router, `src/` folder), npm, deployed on Vercel (free). Next 16 differs from older versions: check `node_modules/next/dist/docs/` before writing Next-specific code.
- Supabase (free tier) for app records and email login. Walrus Memory is the memory layer; the DB is just for app state and all the counting.
- Walrus Memory TypeScript SDK: `@mysten-incubation/memwal` (needs delegate key, account ID, relayer server URL). Docs: https://docs.wal.app/walrus-memory · dashboard: https://memory.walrus.xyz/dashboard · repo: https://github.com/MystenLabs/MemWal
- Sui: small Move module that records a prediction commitment (hash) and emits an event. Use Tatum's Sui **gRPC** gateway (`https://sui-mainnet-grpc.gateway.tatum.io`, API key sent as `x-api-key` metadata). Tatum's Sui JSON-RPC was switched off July 2026, so don't use it. Docs: https://docs.tatum.io
- Tests: Vitest (`npm test`).
- Keep all Walrus calls in one module and all Tatum calls in one module so judges can find them easily:
  - `src/lib/walrus.ts` — every Walrus Memory call
  - `src/lib/tatum.ts` — every Tatum call (Sui gRPC + Prediction Markets)
  - `src/lib/odds.ts`, `src/lib/scoring.ts` — pure maths, fully tested

## Verify before building each part
- Exact Walrus Memory SDK usage and what counts as a memory.
- Tatum Sui endpoint, auth, and transaction submission method.
- Whether the free Tatum plan includes the Prediction Markets API, and whether Polymarket has markets for the matches we use.
- A free football results source and odds source, and their limits.
- Current SUI cost per transaction (fund the app wallet with a few dollars).

## Build order (deadline 10 Nov)
- Days 1–3: project setup, prediction journal, Sui stamp via Tatum working end to end.
- Days 4–6: Walrus Memory writes + recall; result grading.
- Days 7–9: Memory Check with market comparison.
- Days 10–11: small tipster check; scorecard.
- Days 12–13: polish, README, `.env.example`, blog post draft.
- Days 14–15: record demo, final checks, submit early.
Get one full journey working before adding anything else.
The **order** matters (each step builds on the one before). The **days** are only a rough guide: if a step is finished and tested early, move straight to the next. If a step runs late, tell Maverick and cut from the later, optional items, not from the core requirements.
**Hard date:** the "enter a prediction and lock it" feature must work by **6 Nov**, so real picks for the 7–8 Nov matches go through the app live.

## Security
- `.env` is never committed. Provide `.env.example` with placeholders.
- Secret-bearing calls (Tatum key, app wallet key, Walrus key) run server-side only.
- Test failure cases: RPC down, transaction fails, memory read/write fails, odds missing, match postponed.

## Data already being collected
Maverick and a friend are logging real predictions in a Google Sheet before kickoff, starting the weekend of 31 Oct–1 Nov, plus midweek European games. Columns: Predicted by, Logged at, Match, League, Kickoff, Pick, Confidence, Reason, Odds for your pick, Market chance, Result, Correct?. Build an importer for this sheet (CSV export), marking rows as "imported" (not locked onchain).
- The sheet is a **stopgap only**. Once the app can save and lock predictions (target 6 Nov), new picks go through the app; the 7–8 Nov matches should be logged live in the app.
- Real users never use a sheet. The importer is for our own history.
- The two predictors are just our demo data. The product itself is for anyone: every user has their own account, history and Memory Check. Don't build anything specific to two people.

## Writing style (all app text, README, blog post, demo script)
- Write like a real person talking to a football fan: short, plain, specific.
- Use concrete details ("You were 80% sure. You were right 2 of 9 times.") instead of vague claims.
- Avoid AI-sounding filler and clichés: "unlock", "seamless", "revolutionize", "empower", "leverage", "in today's fast-paced world", "dive into", "game-changer", "elevate", em-dash-heavy sentences, and lists of three adjectives.
- No hype. Say what the app does and what it can't do.
- Show Maverick any user-facing text before finalising it.

## New-user experience (cold start)
A brand-new user has no history, so the app must still be useful on the first pick:
- Sign up with email — no wallet, no crypto.
- Market comparison works immediately ("Bookies give this 55%, Polymarket 52%").
- Memory Check says plainly "Not enough history yet — patterns start after about 10 settled picks" instead of inventing insights.
- Once picks are settled, Memory Check uses their real history. Show sample size on every pattern ("based on 18 picks").
