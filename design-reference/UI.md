# UI Spec (version 2, white redesign)

This replaces every earlier UI.md. Read it with CLAUDE.md. CLAUDE.md still wins on product rules, honesty and wording.
Mockups are in `design-reference/` (Main = Matches, Calls, Records, Proof, SignIn, Logo). Their CSS, SVG, colours and timings are the source of truth. Copy the values, not the mockup file format.
Logo files are in `brand/`.

## Ground rules
1. **Keep everything that already works.** Data job, scoring, Sui, Walrus and sign-in logic stay as they are, except the fixes listed in "Fixes to how it works" below.
2. Run all tests after each change. Check every screen at 360px and 390px wide, then desktop.
3. Every animation turns off under `prefers-reduced-motion: reduce`.
4. CSS and inline SVG only. No animation libraries, no video.
5. Show Maverick screenshots of each screen before moving on.

## Fixes to how it works (do these first)
1. **Show the whole week, grouped by league.** The Matches page lists every game from today to 7 days ahead, for every covered league, using football-data.org fixtures. Games without odds yet still show, with "Odds come in the day before kickoff." Leagues with no games this week show "No [league] games this week."
2. **Local time everywhere.** Kickoffs, stamp times and memory times use the viewer's own time zone from the browser, with the zone label (e.g. "5:30pm WAT"). Never show server or UTC time.
3. **Make stamping feel instant.** When a user taps a call:
   - Show the stamp card immediately in a "Stamping on Sui..." state (spinner in the check circle).
   - Send the Sui transaction and return as soon as Sui confirms it (don't wait for extra indexing or the Walrus write). Sui usually confirms in about a second.
   - Save to Walrus **in the background** after the stamp is confirmed. Retry on failure.
   - Swap the card to "Stamped on Sui at [local time]. Saved on Walrus." and show "View on Sui".
   - If stamping fails, show "Couldn't stamp. Try again." with a retry button. Never lose the call.
   - Log how long each step takes. Target under 3 seconds from tap to "Stamped".
4. **Only show a user their own calls.** Remove other users' calls ("A fan's call saved") from every page. Other people's calls are private.
5. **"Biggest gap this week" only when it matters.** Pick from all of this week's games that haven't kicked off and have a Polymarket market above the volume threshold. Only show the card if the gap is **5 points or more**. Otherwise hide it.
6. **No raw Walrus IDs on screen.** Show "Remembered on Walrus" / "Check" links instead. Put the full ID behind the link (or a copy button on the Proof page).

## Pages and navigation
Four pages, always in the bottom nav, **each with an icon and a label**:

| Nav label | Page | Replaces |
|---|---|---|
| Matches | Coming up (home) | Coming up |
| My calls | The user's calls | Your calls |
| Records | Who's been closer, by gap and league, plus "You vs the market" | Scorecard |
| Proof | How Tatum, Sui and Walrus are used, with live lists to check | Memory |

Sign in lives in the header (a "Sign in" button when logged out, a profile button when logged in). Email and "Log out" move to a profile sheet, not the My calls page.

**Bottom nav:** floating glass bar, 14px from the sides and bottom, radius 26px, 4 equal items. Each item: 20px icon above a 12px label. Active item: ink background (`#0B1A14`), white label, lime icon. Respect `env(safe-area-inset-bottom)`. On desktop, the same bar can sit at the top.

## Look and feel

### Colours
| Token | Value | Use |
|---|---|---|
| page | `#F3F6F4` | Background |
| glow-lime / glow-sky / glow-amber / glow-mint | `#C6F36B`, `#8FD3FF`, `#FFD58A`, `#4FE0B5` at 35–50% opacity, blurred 70–80px | 2–3 soft colour blobs per page behind the glass, so the glass has something to blur |
| glass | `rgba(255,255,255,0.62)`, border `rgba(255,255,255,0.95)`, shadow `0 12px 32px rgba(11,26,20,0.07)`, `backdrop-filter: blur(18px) saturate(140%)` | Cards, tabs, nav |
| ink | `#0B1A14` | Text, primary buttons, active tabs and nav, the stamp card |
| hero | White glass (same as cards) with **one** soft green glow blob in a corner (`rgba(15,169,104,0.28)` to `rgba(198,243,107,0.2)`, blurred 20px, slow drift). Record card inside an open match: `rgba(15,169,104,0.07)` with a 1px `rgba(15,169,104,0.18)` border. | **Hero cards** (the card that carries the main number on each page, and the record card inside an open match). No multi-colour gradients. |
| hero-number | `#0E7A4F` | The main number in a hero card |
| hero-muted | `#3F5A4C` | Secondary text on hero cards |
| muted | `#4F6158` | Secondary text |
| faint | `#5F6F67` | Small labels (keep 4.5:1 contrast on white) |
| bookies | **Charcoal.** Bar shades `#1E2B25` / `#6F7C75` / `#D5DBD8`, text `#1E2B25` | Everything bookies. Marker: **square**. |
| polymarket | **Green.** Bar shades `#0FA968` / `#7FD8B0` / `#D3F2E4`, text `#0A7A4C`, tint `rgba(15,169,104,0.12)` | Everything Polymarket. Marker: **circle**. |
| lime-mint | `linear-gradient(120deg, #C6F36B, #4FE0B5)` | Small highlights only: badges, the stamp check, active icon |
| win / loss | `#0E7A4F` / `#C0362C` | "Spot on" / "Missed it" stamps only |

**Colour rule (new):** the page is white, ink and one green family. No amber, no blue, no rainbow gradients on data screens. Bookies are charcoal, Polymarket is green, lime `#C6F36B` is for small highlights (badges, stamp check, active nav icon). The logo keeps its own colours. The square vs circle markers still tell the two sources apart for colour-blind users.

**Hero "lamp" effect (hover or touch only):** every hero card has a hidden layer with a bright lime-to-mint glow and faint pitch markings (touchline, halfway line, centre circle, boxes) in `#0E7A4F` at 50% opacity. It's invisible until the pointer is over the card: then a soft 150px circle of it follows the mouse (or finger while dragging) and fades out 320ms after the pointer leaves. Build it with a CSS radial `mask-image` positioned by `--mx` / `--my` custom properties, set directly on the element in the pointer handler (no React re-render). The card must look complete without it.

### Fonts
- **Archivo** 700–900, tight letter-spacing (-0.02 to -0.05em): titles, team names, all numbers
- **Schibsted Grotesk** 400–700: everything else
- `font-variant-numeric: tabular-nums` on every number

### Sizes (phone)
- Page title: Archivo 900, **52px**, line-height 0.95
- Section title (league names, "By league"): Archivo 800, 24–26px
- Hero numbers: Archivo 900, 60–76px
- Team names: Archivo 700, 16px. Kickoff time: Archivo 800, 22px
- Body 15–16px. Labels 12–13px.

### Motion (keep it to these)
- **Page title:** each word slides up from behind a mask once on load (620ms, second word 90ms later).
- **Odds bars** grow in from the left once (700ms).
- **Hero numbers (on every page, every time the page opens):** for about 0.9 seconds the digits **roll rapidly** through different numbers like a fast-spinning counter (change every 40ms, slightly blurred), then land on the real number with a quick pop and a green flash. This must be clearly visible even when the real number is small (e.g. 2). Applies to: the record in an open match, the Records hero, the My calls hero. Re-runs when switching the Records gap tab.
- **Stamp card:** drops, squashes, settles, with dust from its bottom corners (see Matches).
- **Records gap tabs:** numbers re-count and the bar slides to the new split when you switch.
- **Proof page:** a small mint dot runs down the line between the 4 steps; the newest memory pulses once.
- Buttons press in slightly (scale 0.97) when tapped.

## Matches (Coming up)
Top to bottom:
1. **Header:** logo icon + "hindcast" wordmark on the left, "Sign in" (ink pill) on the right.
2. "This week, [date range]" in muted text, then the title **"Coming up"** (52px, animated), then one line: "Bookies vs Polymarket on every big game, and who's been right before."
3. **League tabs:** All, then each covered league, each with its game count in a small pill. Selected tab is ink. Scrolls sideways.
4. **Biggest gap this week** (only if 5+ points, see Fixes): white glass hero card with the lamp effect. Top: small ink pill "Biggest gap this week", the match (Archivo 800, 28px), then "Premier League, Sat 5:30pm WAT. Chance Arsenal win." Below, side by side: the gap as a big green number "12" (72px) with "points apart" under it, and two thin labelled bars: Bookies 48% (charcoal, square marker) and Polymarket 60% (green, circle marker). Nothing should wrap awkwardly at 360px.
5. **League sections**, one per league (or just the selected one): league name as a 26px title with "5 games" on the right. Games grouped under day labels ("Today", "Sat 31 Oct").
6. **Match card (glass):**
   - Team row: crest, name | kickoff time + zone | crest, name
   - **Odds comparison (two stacked rows, always both visible, no sliding):**
     - Left: a plain label, 96px wide, no chip box: small square + "Bookies" (charcoal), or small circle + "Polymarket" (green).
     - Right: a 30px bar split into home / draw / away, widths = the chances, numbers inside each part ("57%"). Darkest shade for home, mid for draw, light for away.
     - Under the bars, small labels lining up: home team, Draw, away team.
     - Then one verdict pill: "Polymarket rates Roma 8 points higher" (green tint) or "Bookies rate ... higher" (green tint) when the gap is 5+, otherwise "They agree on this one" (grey).
   - Bookies only: just the bookies row, plus "No Polymarket market for this game yet."
   - No odds yet: "Odds come in the day before kickoff."
   - **Every card has a full-width "Make your call" button** under the odds (light grey, ink text, down arrow). It also shows on cards where odds aren't in yet. After a call it reads "Your call: Roma win". Tapping it opens the card, and the button becomes a small "Close". Only one card is open at a time, and none is open when the page loads. Open card shows:
     - **Record (record card with the lamp effect):** a plain sentence first: "When they disagreed like this before, Polymarket got closer in 9 of 14 Serie A games." Then Bookies number, "of 14 games", Polymarket number (68px, rolling count), and a green "Remembered on Walrus" link to the Proof page. Fewer than 10 games: "Not enough past games like this yet. We need 10 before we show who's been closer."
     - **Your call:** title, three buttons "[home] win" / "Draw" / "[away] win". Selected is ink.
     - **Logged out:** the buttons still show. Tapping one does NOT lock anything. It opens a small sign-in card in place: "Sign in to lock \"Roma win\"", one line ("It's free. We need it so your calls are saved to you, and nobody else can make them for you."), "Continue with Google" (ink) and "Continue with email". After sign-in, bring them back to the same game with that pick already chosen, then stamp it. Nothing is stamped or saved for logged-out users. The server must also reject a call with no signed-in user.
     - **Stamp card:** dark ink card that lands with dust (480ms drop and squash, 12 small dark dust dots from the bottom corners, in front of the card). Content: lime check circle (spinner while stamping), "Locked: Roma win", "Stamped on Sui at 10:42am WAT. Saved on Walrus.", lime "View on Sui" button linking to `https://suiscan.xyz/mainnet/tx/<digest>`.
7. **Spacing:** sections are tight. 10px between a league title and its cards, 18px between sections. Leagues with **no games** don't get a section. Put them in one line at the bottom: "No games this week: Ligue 1, Bundesliga" (small grey pills). A league with one game is just its title plus that card, no extra space under it.
8. Crests: real club crests from football-data.org, matched by team ID (see the crest rules from before: check script, fallback to initials, alt text, README note).

## My calls
1. Header, title **"My calls"** (animated).
2. **White glass hero card with the lamp effect** (no ring):
   - Top row: a big green "1" (68px, rolling count) with "of 2" beside it, "finished calls right" under it, and an ink pill "50%" on the right.
   - **"Your form, newest last":** a row of 5 tiles like a football form guide, one per recent finished call. Green tile with a white tick = called it. Red tile with a white cross = not this time. Dashed empty tile = no call yet. They pop in one after another (70ms apart). Each tile has an `aria-label`.
   - A white pill with a blue border and circle: "Went against Polymarket's pick: right 1 of 1".
3. **Tabs:** "Upcoming 2" / "Finished 2" (glass segmented control, active is ink).
4. **Call card (glass):**
   - League and kickoff (local time), match name, and for finished games "Full time 2-4".
   - **A stamp in the top-right corner**, tilted -8°, that lands with a small bounce: "Locked" (lime fill, ink border) for upcoming, "Spot on" (green) or "Missed it" (red) for finished.
   - Three result tiles: home / Draw / away. Your pick is ink with "Your call" under it. On finished games, the actual result has a green border and "Result" under it.
   - Buttons: "Sui proof" (ink pill, opens Suiscan), "On Walrus" (grey pill, opens Proof), and "Changed 2 times" if the call was edited.
   - "Changed" opens a small timeline: each version with its time, newest filled.
5. Remove the old line "Made before Your call existed, so it won't be scored". If imported or legacy calls exist, label them "Not scored" in the stamp instead.

## Records
1. Header, title **"Records"**, line "After every game, we check who got closer to the real result."
2. **White glass hero card with the lamp effect:** label for the current filter ("All graded games"), an ink "Early signal" pill if under 10 games, big Bookies and Polymarket numbers (76px, rolling count every time the page opens or the tab changes), "of 8 games", and a split bar (amber / blue on a light track) showing the share.
3. **"Does the gap matter?"** with "Pick how far apart they were before kickoff." and a 4-part segmented control: **All** (any gap), **Close** (under 5), **Medium** (5 to 10), **Big** (10+). Switching re-counts the hero numbers and slides the bar. Empty: "No games with a gap this big yet. Check back after the weekend." This replaces the old "When they disagreed" list. It's the same data, but now it answers one clear question.
4. **By league:** one glass row per league with the name, "2 - 6" in source colours, a thin split bar, and "8 games. Early signal, under 10 games." Tap to see the last 3 games and who was closer. Leagues with none: "No finished games yet."
5. **You vs the market:** three glass tiles: "1/2 Your calls right", "1/1 When you picked differently from Polymarket" (green), "0/1 When you picked differently from the bookies" (charcoal). Logged out: a "Sign in to see your record" tile.
6. One link at the end: "Every record here is saved on Walrus. See the proof." No raw IDs.

## Proof
This page is for judges and curious users. It shows exactly how Tatum, Sui and Walrus are used.
1. Header, title **"Proof"**, line "Where every number comes from, and where you can check it."
2. **How it works:** 4 numbered steps in one glass card, joined by a vertical line with a moving mint dot:
   1. **Read the odds** (tag: Tatum). "Polymarket prices via Tatum, bookie odds via The Odds API."
   2. **Stamp them** (tag: Sui). "Locked on Sui before kickoff, so nobody can change them later."
   3. **Remember it** (tag: Walrus). "Odds, result and who got closer, saved on Walrus."
   4. **Use it next time** (tag: Walrus). "Past games like it come back from Walrus to show who to trust."
   Keep it to these one-liners. The page is mainly for judges, so it stays in its own tab and never interrupts the main pages.
3. **Three live counters:** Walrus memories, Sui stamps, Tatum data reads today. Real numbers.
4. **Remembered on Walrus:** tabs "Game memories" / "My memories" (mine only when logged in). Rows: icon tile (% for odds, FT for result, +1 for record, "You" for a call), title, short detail, local time, and a "Check" link to where that memory can be verified.
5. **Stamped on Sui:** latest stamps. Each row: the match in bold (Archivo 16px, one line, cut with "..." if too long). Under it, a small tag then the local time. Tag is grey "Odds before kickoff" for the app's readings, or lime "Your pick: Frosinone win" for the user's own picks. No "saved by" line. "Suiscan" button on the right. Keep the time display as it is now.
6. **Live from Tatum:** last Polymarket price check time, last Sui stamp sent, network "Sui Mainnet". Real values from logs.

## Sign in
- Keep the dark floodlight page exactly as it is (220px smooth-following light, 3D balls and kits, only visible inside the light).
- **The panel becomes white glass:** `rgba(255,255,255,0.78)`, `backdrop-filter: blur(22px) saturate(150%)`, white border, big soft shadow, ink text.
- Panel content: Hindcast icon + wordmark, heading "See who's been right before you pick." (Archivo 800, 30px), muted line, "Continue with Google" (ink button), "Continue with email" (white outline button), "Just looking? Browse games" (ink link).

## Name and logo
- App name **Hindcast**, kept in one setting. Wordmark "hindcast" lowercase, Archivo 800, tight. No tagline.
- `brand/hindcast-icon.svg` main icon, `brand/hindcast-icon-lime.svg` lime version, `brand/hindcast-favicon.svg` for small sizes. Small icon in each page header (26px, the favicon version on ink).
- Meaning for README and blog: a rear-view mirror (hindsight), with a pitch inside, the bookies' square far away and Polymarket's circle close up.

## Assets
- Real club crests (see Matches). No player photos. No bookmaker or Polymarket logos, use the chips and markers.

## Wording
Plain, short, like a fan talking to a friend (see CLAUDE.md). Cut anything a user doesn't need. Show Maverick any new text first.

## Mobile checks (must pass)
- 360px and 390px wide: nothing cut off, no sideways scroll except league tabs. Long team names in call buttons shorten to the short name.
- All buttons 44px+. Safe areas respected. Bottom nav never covers content (add bottom padding).
- Blur can be slow on cheaper Android phones: if scrolling stutters, lower the blur or drop it on the blobs first.
- Use both `-webkit-` and standard versions of `backdrop-filter` and `mask`. Test Chrome on Android and Safari on iPhone.
- Throttled to Fast 3G, real content or a clean loading state within 3 seconds.
- Maverick checks every screen on his own phone.

## Done when
- The 6 fixes work and are tested
- Every screen matches the mockups at 390px, works at 360px and looks good on desktop
- Stamping goes from tap to "Stamped" in under 3 seconds in normal conditions
- All tests pass, contrast is 4.5:1+, keyboard focus is visible, reduced motion turns animations off


## Calm colour pass (latest)
- No multi-colour gradients anywhere. Hero cards are white glass, the same as other cards.
- Page glow blobs: at most two, green `#0FA968` and lime `#C6F36B`, low opacity (0.2 to 0.3). No sky blue or amber blobs.
- Hover lamp: soft lime glow, pitch lines in ink at 18% opacity.
- My calls form tokens: 40px, soft tints with a coloured icon. Right: green tint `rgba(15,169,104,0.14)` + green tick. Wrong: red tint `rgba(192,54,44,0.1)` + red cross. Empty: dashed outline. No solid red or green blocks.
- "Went against Polymarket's pick" means you picked a different result from the one Polymarket gave the highest chance.

## Proof page: Stamped on Sui labels (latest)
- Under the "Stamped on Sui" title, one line: "Saved before kickoff, so nobody can change them after the result."
- Each row says what was saved and who saved it:
  - App readings: title "Odds before kickoff: Frosinone v Lecce", subline "Saved by the app · Today, 1:30pm WAT"
  - User calls: title "Your pick: Frosinone win", subline "Saved by you · Today, 10:41am WAT"
- **Times:** don't use `tabular-nums` on times with a colon. It adds wide gaps ("1 : 30pm"). Times must read "1:30pm". Keep `tabular-nums` only on plain numbers and percentages.

## Sign-in panel (latest)
The panel is now **dark glass**, not white, so it sits inside the floodlit pitch: background `rgba(8,20,15,0.55)`, blur 18px, border `rgba(255,255,255,0.12)`, white heading, `#B9C7BF` body text. "Continue with Google" is lime `#C6F36B` with ink text. "Continue with email" is a white outline (22%) on a faint white fill. "Just looking? Browse games" is light grey. Logo gets a thin light border so it shows on the dark panel.
