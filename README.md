# Oddsight

[![Tests](https://github.com/Maveri-Q/total-recall-hackathon/actions/workflows/tests.yml/badge.svg)](https://github.com/Maveri-Q/total-recall-hackathon/actions/workflows/tests.yml)

**Bookies vs Polymarket before every big football game, and a record of who turned out right.**

## Judge quick start

**Live app: https://total-recall-hackathon.vercel.app**

No sign-up needed to look around.

**The 60-second tour**
1. **Matches** (the home page): this week's games from 6 leagues. Each game shows the chance the bookies give each result next to Polymarket's, as two bars.
2. Tap **Make your call** on a game. You'll see who's been closer in past games where the two disagreed by a similar amount, built from memories recalled from Walrus.
3. Tap a pick. Signed out, you'll get a sign-in card instead: nothing is saved for signed-out users. Signed in, your call lands as a card that says "Stamped on Sui", with a link to the real transaction.
4. **Records**: the score so far, bookies vs Polymarket, by gap size and by league, with sample sizes.
5. **Proof**: how Tatum, Sui and Walrus are used, with live counts and a "Check" link on every memory and stamp.

## What it does

Oddsight (odds + hindsight) reads the bookies' odds and Polymarket's price for the same game, stamps that
reading on Sui before kickoff, checks after full time who was closer, and remembers it all on Walrus.
Next time the two disagree, it looks back at games like this one and shows who's been closer, with the
number of games behind it. You can make your own call too: one tap, stamped on Sui, scored after the game.

It's not a betting site. No bets, no stakes, no payouts.

## Real data only

The live app uses real bookmaker odds (The Odds API), real Polymarket prices (through the Tatum Prediction
Markets API) and real results (football-data.org). There is no demo or sample data. Every reading, result,
stamp and memory you see came from a real game. Nothing is imported or seeded. If that ever changes, those
rows will be labelled "imported" in the app.

## Mainnet proof

Checked 29 Oct 2026. Updated again right before submission.

| What | Value |
|---|---|
| Walrus memories saved on Mainnet | **41** (readings, graded results, league records and users' calls) |
| `MEMWAL_AGENT_ID` (Walrus Memory account ID) | `0xfdf452a10a829d4b5f7331a2a993b5ee088456717d9b6cd221b18dbf868f27b8` |
| Sui package (our `stamp` Move module) | [`0xa4b3e8cc…df210237`](https://suiscan.xyz/mainnet/object/0xa4b3e8ccb8b9331838bb8257c4ec06d3ea7848b67c4cabde3248b7e6df210237) |
| App wallet that pays for stamps | [`0x6d7a28ce…e388f88f3a`](https://suiscan.xyz/mainnet/account/0x6d7a28ce3c59ebe4596e2d13ac7872b2ef9a828945bfd6cbad9df8e388f88f3a) |
| Sui stamps so far | 19 odds readings and 10 user calls |
| Walrus Memory dashboard | https://memory.walrus.xyz/dashboard |

Real stamps on Suiscan:
- [Frosinone v Lecce, odds before kickoff](https://suiscan.xyz/mainnet/tx/CFjLWQ9KusznghbMfvTgm9vg6rwdgskvJRFLd9Dma7EA) (29 Oct)
- [Genoa v Juventus, odds before kickoff](https://suiscan.xyz/mainnet/tx/7WNEaWHGHaWmfPXxYHaYsMMH1aTgFEJ8G3nBxTh5FZvN) (28 Oct)
- [Venezia v Inter Milan, odds before kickoff](https://suiscan.xyz/mainnet/tx/BRf68ubeaEYXqrurX5zt56mssyiUZ37U6NjspGsZ3UDK) (28 Oct)
- [The first 11 readings, stamped in one transaction](https://suiscan.xyz/mainnet/tx/5cuZ4iPqHRDHPwqad4ggBb7DX7V82kBnj3Gc4kFpnHoC) (28 Oct)
- [A user's call](https://suiscan.xyz/mainnet/tx/CjSLMY8HhVgriVBKmVvCDAjN2E2C9sW4GxJwPw7grGcn)

## How it uses Tatum, Sui and Walrus

- **Tatum Prediction Markets API:** Polymarket prices for each game, fetched within seconds of the bookie odds so the two readings match in time.
- **Tatum Sui gRPC gateway:** every Sui transaction (stamping readings and calls) and every Sui read goes through `sui-mainnet-grpc.gateway.tatum.io`.
- **Sui:** a small Move module (`move/sources/stamp.move`) records a fingerprint (sha256) of each reading before kickoff, and of each user call. Only the fingerprint goes onchain.
- **Walrus Memory:** every reading, graded result, league record and user call is saved as a memory. Before each game, past games with a similar gap come back from Walrus recall, and the code counts who was closer.

The database does the counting, Walrus does the remembering. The maths (odds to chances, the Brier score for "who was closer") is plain tested code in `src/lib/odds.ts` and `src/lib/scoring.ts`.

## The logo

A rear-view mirror, because hindsight means looking back. Inside it is a football pitch, with the bookies'
square far away and Polymarket's circle close up, showing "who's been closer". Logo files are in `brand/`.

## Where things live

- `src/lib/tatum.ts`: every Tatum call (Sui gRPC gateway + Prediction Markets API)
- `src/lib/walrus.ts`: every Walrus Memory call
- `src/lib/odds.ts`, `src/lib/scoring.ts`: the maths, fully tested
- `src/lib/data-job/`: the hourly job (readings, Sui stamps, grading, Walrus memories)
- `supabase/migrations/`: the database, one numbered file per change

More detail (setup, `.env.example`, how the app wallet pays for stamps) is coming before submission.

## Credits

Club crests belong to their clubs and are shown only to identify teams.
