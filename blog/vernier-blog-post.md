# Vernier: we graded the bookies and Polymarket on 72 football games

*Built for the Total Recall hackathon (Tatum × Walrus), Track 1.*

Live app: https://vernier-odds.vercel.app
Code: https://github.com/Maveri-Q/total-recall-hackathon
Demo video: https://youtu.be/Lr9FJKmTUhE

---

## The problem

Before a big game, you see a bookie's odds. Say Real Madrid are 78% to win.

Over on Polymarket, people trade real money on the same game. There, Madrid are 81%.

Same match. Two prices. Nobody tells you when they disagree, or which one is usually right.

Vernier does.

## What Vernier does

Vernier compares the bookies with Polymarket before every big game. It remembers which one turned out right, and tells you who to trust next time.

It does this on its own, every hour, for 6 leagues: Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and the Champions League.

1. **Read the odds.** Before each game, it takes the odds from about 20 bookies and the price on Polymarket.
2. **Turn them into chances.** Odds of 2.00 mean a 50% chance. Bookies add a small cut, so we scale the three chances (home, draw, away) to add up to 100%. Same for Polymarket.
3. **Stamp it on Sui.** A fingerprint of the reading goes on the Sui blockchain before kickoff. After that, nobody can change it. Not even us.
4. **Check who was closer.** After full time, it gets the result and scores both sources.
5. **Remember it in Walrus.** The reading, the result and the score are saved in Walrus Memory.
6. **Use the memory next time.** Before the next game, Vernier looks back at past games like it and shows who got closer in them.

You can also make your own call on any game. One tap. It gets stamped on Sui too, and graded after the match.

Vernier is not a betting site. No bets, no money, no tips. It just shows the evidence.

## One real game, start to finish

**Racing Santander v Real Madrid, La Liga, Sunday 1 November.**

- **Before kickoff:** the bookies gave Madrid a 78% chance to win. Polymarket gave 81%. $332,648 had been traded on Polymarket for this game.
- **The stamp:** the reading was stamped on Sui at 11:18 UTC. Kickoff was 15:15. So it was locked in 3 hours 57 minutes early. [See it on Suiscan](https://suiscan.xyz/mainnet/tx/46XxatkKHrhbFmQQrJk5aF1aNNLYcyVWS8JkGgaWH84a).
- **Full time:** Madrid won 3–0.
- **Who was closer:** Polymarket. It gave the result that happened a higher chance.
- **Memory:** the reading, the result and the score were all saved in Walrus.

## How we decide who was closer

We use the Brier score. It's simpler than it sounds.

For each source, look at the chance it gave each result. Compare it with what happened: 100% for the result that happened, 0% for the other two. Square each gap and add them up. **Smaller is closer.**

Example. Chelsea v Man United, and Chelsea win:

> Bookies: Chelsea 48%, Draw 27%, Man United 25%. Brier score 0.41.
> Polymarket: Chelsea 60%, Draw 22%, Man United 18%. Brier score **0.24**.

Polymarket gave Chelsea more chance, so it scores lower. Polymarket was closer.

All the counting happens in our own code, the same way every time. Walrus remembers; it doesn't do the maths.

## How it uses Tatum

Tatum is a service that lets apps talk to blockchains and onchain data without running their own servers. Vernier uses it for two jobs:

- **Polymarket prices.** Vernier reads Polymarket through Tatum's Prediction Markets API. It finds the game, checks how much has been traded, and gets the price of each result. Games with less than $10,000 traded are saved but left out of scoring, so a quiet market can't skew things.
- **Sui stamps.** Every stamp is sent to Sui through Tatum. The app pays the fee from its own wallet, so users never need a wallet or any crypto. A stamp costs about 0.0001 SUI.

The Proof page also uses Tatum to read each stamp back from Sui. Tap **Check** and it tells you if the stamp matches what we saved.

## How it uses Walrus Memory

Walrus Memory is long-term memory for apps. Vernier saves everything important there:

- **Readings:** the odds and prices for each game.
- **Results:** the score, and which source was closer.
- **Records:** each league's running score, saved again every time it changes.
- **Your calls:** what you picked and how it went, kept to your own account.

That's **416 memories** so far (10 November).

Then Vernier uses them. Before a game, it asks Walrus for past games like this one: same league, similar gap between the two sources. It counts who got closer in those games and shows it on the game's card. Each past game links to its memory, so you can check it.

Here's the difference memory makes, for that Racing v Madrid game:

- **Without memory:** "Bookies 78%. Polymarket 81%."
- **With memory:** "When they disagreed like this before, Polymarket got closer in 4 of 5 La Liga games. Early signal, only 5 games."

Your own calls work the same way. After a few, Vernier tells you things like: "Last 4 times you went against the odds, you were right once."

## How it learned over time

We started saving readings on 27 October. Here's what the app knew as it went.

- **27 October, first results.** Three Serie A games. Polymarket was closer in all three. Far too few to mean anything.
- **1 November, 35 games.** The first real pattern: the two sources nearly always agree. No gap was 5 points or more. The typical gap was about 1 point.
- **10 November, 72 games.** Polymarket was closer in **51**. The bookies in **21**. The gaps are still tiny, usually less than 1% apart. So Polymarket wins most games, but only by a little.

Each step is saved on Walrus as it happens. On the Records page, "How this changed" shows the record after each game, and each step links to its memory. Nothing is back-dated.

This also changed what the app says. In the first days, game cards said there weren't enough past games yet. Now they show a real record from Walrus, with the number of games behind it, and label small samples "early signal".

## What we got wrong, and what we learned

- **The gaps are small.** We built Vernier to spot big disagreements. In 72 games, the two were never 5 points or more apart. The bookies and Polymarket agree far more than we expected. That's a finding too.
- **We changed how we count once.** At first, games where the two were within 3 points counted as "too close to call". With gaps this small, that hid almost every result. On 10 November we switched to one simple rule: the lower score is closer, however small the gap. Every game was re-graded the same way, and the old records stay on Walrus.
- **Our first Tatum account ran out of free credits on 6 November**, so the games on 7 and 8 November weren't read. We moved to a second account. Now, if Polymarket can't be reached, the app still saves the bookie odds and says "Polymarket unavailable". It never guesses.
- **Walrus had an outage** on the night of 30 October. Nine memories failed to save. The app now tries failed memories again two hours later, so an outage delays a memory but never loses it.
- **A stamp proves when, not who's right.** It shows when we recorded a price. It doesn't prove every bettor could get that price, or that a source can be trusted.

## Built with

- **Next.js + TypeScript** on Vercel, **Supabase** for the database and sign-in (Google or email).
- **The Odds API** for bookie odds, **football-data.org** for results.
- **Tatum** for Polymarket prices and Sui stamps. **Walrus Memory** for everything the app remembers.
- A small **Move** program on Sui that records each fingerprint.
- An hourly data job on GitHub Actions.
- **200 tests**, run every time the code changes.

## Try it

Open https://vernier-odds.vercel.app. No sign-up needed to look around.

To make a call, use the judge test account in the README, or sign in with Google or email. No wallet, no crypto. The app pays the fees.

Thanks to Tatum and Walrus for the hackathon.
