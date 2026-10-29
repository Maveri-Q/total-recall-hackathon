# Oddsight

**Bookies vs Polymarket before every big football game, and a record of who turned out right.**

Oddsight (odds + hindsight) reads the bookies' odds and Polymarket's price for the same game, stamps that
reading on Sui before kickoff, checks after full time who was closer, and remembers it all on Walrus.
Next time the two disagree, it looks back at games like this one and shows who's been closer, with the
number of games behind it. You can make your own call too: one tap, stamped on Sui, scored after the game.

It's not a betting site. No bets, no stakes, no payouts.

Live: https://total-recall-hackathon.vercel.app

## The logo

A rear-view mirror, because hindsight means looking back. Inside it is a football pitch, with the bookies'
amber square far away and Polymarket's blue circle close up, showing "who's been closer". Logo files are in
`brand/`.

## Where things live

- `src/lib/tatum.ts`: every Tatum call (Sui gRPC gateway + Prediction Markets API)
- `src/lib/walrus.ts`: every Walrus Memory call
- `src/lib/odds.ts`, `src/lib/scoring.ts`: the maths (odds to chances, Brier score), fully tested
- `src/lib/data-job/`: the hourly job (readings, Sui stamps, grading, Walrus memories)
- `supabase/migrations/`: the database, one numbered file per change

More detail (setup, `.env.example`, how the app wallet pays for stamps) is coming before submission.

## Credits

Club crests belong to their clubs and are shown only to identify teams.
