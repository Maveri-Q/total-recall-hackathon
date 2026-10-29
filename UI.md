# UI Spec

Read this together with CLAUDE.md. CLAUDE.md still wins on product rules, honesty and wording.
The reference mockup files are in `design-reference/` (Main, SignIn, Memory). They use a mockup format, but the CSS, SVG shapes, colours and animation timings in them are the source of truth. Copy those values; don't copy the file format.

## Ground rules
1. **Don't change how anything works.** No new features, no changes to the data job, scoring, Sui or Walrus logic. UI only.
2. **Run all tests after each change.** Check every screen at phone width (390px) first, then desktop.
3. **Mobile first.** Most users are on phones. Judges will often be on laptops, so desktop must look good too.
4. **Respect "reduce motion".** Every animation listed here turns off under `prefers-reduced-motion: reduce`. Content still shows, just without movement.
5. **Fast.** No video, no heavy images, no animation libraries unless already installed. CSS and inline SVG only. The page must show real content within about a second.
6. **Show Maverick screenshots** of each screen before moving to the next one.

## Build order
1. Colours, fonts and spacing (tokens below), applied app-wide
2. Coming up page: featured card, match cards, sliding odds, the record, Your call
3. Stamp card landing with dust
4. Walrus memory pieces (the record and the Memory page)
5. Bottom navigation
6. Sign-in page with the floodlight, floating balls and kits

If time runs short, cut from the bottom of this list, never the top.

## Tokens

### Colours
| Token | Value | Use |
|---|---|---|
| ground | `#0A1712` | Page background |
| ground-glow | radial `#143528` → `#0A1712` at the top 50% | Subtle light at the top of each page |
| deep | `rgba(6,17,13,0.6)` | Record panel background |
| glass | `rgba(255,255,255,0.045)` + border `rgba(255,255,255,0.08)` + `backdrop-filter: blur(14px)` | Cards |
| chalk | `#F2F5F1` | Main text |
| muted | `#C9D6CE` | Secondary text |
| faint | `#9DB1A6` | Labels |
| fainter | `#7F978A` | Notes, dates (only on dark ground, keep contrast at 4.5:1) |
| lime-mint | `linear-gradient(120deg, #C6F36B, #4FE0B5)` | Primary buttons, selected states, the featured card. Use sparingly. |
| bookies | `#F5A524` | Everything about bookies. Marker is a **square**. |
| polymarket | `#8FD3FF` | Everything about Polymarket. Marker is a **circle**. |

Bookies vs Polymarket must also differ by **shape** (square vs circle), not just colour.

### Fonts (Google Fonts)
| Font | Use |
|---|---|
| **Archivo** 600–800, letter-spacing -0.01em to -0.03em | Page titles, team names, kickoff times, percentages, record numbers, the "Locked" card |
| **Schibsted Grotesk** 400–600 | Everything you read: body, labels, buttons |

Only these two fonts. No Doto, no monospace.

Use `font-variant-numeric: tabular-nums` on every number so they line up.

### Type scale (phone)
- Page title: Archivo 700, 30px
- Featured card title: Archivo 800, 26px
- Section heading: Archivo 700, 20px
- Kickoff time: Archivo 700, 22px
- Team name: Archivo 600, 16px
- Percentages in pills: Archivo 700, 17px
- Body: Schibsted 400, 15px, line-height 1.5
- Labels and notes: Schibsted 400–500, 12–13px
- Record numbers (bookies / Polymarket count): Archivo 800, 36px

No thin weights below 16px. Make less important text a softer colour, not a lighter weight. No ALL-CAPS labels.

### Shape and spacing
- Cards: radius 24px, padding 18px 16px
- Pills and buttons: fully rounded (999px), min height 44–52px (touch targets ≥ 44px)
- Gap between cards: 22px. Inside cards: 16px.

## Screens

### 1. Coming up (main page)
Top to bottom:

**Header:** small day label ("Thursday evening"), "Coming up" title, round glass profile button on the right.

**League chips:** a row that scrolls sideways: All, Premier League, Serie A, La Liga, Ligue 1, Bundesliga, plus whatever leagues the data job covers. Selected chip is chalk with dark text. Filters the list.

**Featured card, "Biggest gap today":** lime-mint gradient card, dark text. Shows the match with the biggest bookies-vs-Polymarket gap today: pill "Biggest gap today", league and kickoff, the match name, then the gap as the hero: a big **"8"** (Archivo 800, 56px) with "points apart" beside it, and on the right "Bookies 58%" and "Polymarket 66%". Under it: "Chance Roma win. The bookies and Polymarket disagree most on this game today." No lines or icons. Tapping it opens that match's card.
  - **It updates by itself.** Recalculate it from the latest readings every time the data job saves new ones, and whenever the page loads. Pick the match with the biggest gap (using the home-win chance) among today's games that **haven't kicked off yet** and have a Polymarket market above the volume threshold. Ties go to the earlier kickoff. Once that match kicks off, the next biggest gap takes its place.
  - Show when it was last checked, small: "Updated 20 min ago".
  - **Motion:** still on page load (the record's count-up is the page's main animation). Animate **only when the featured match changes** while the page is open: the old content slides out to the left and fades (250ms), the new match slides in from the right (300ms, ease-out), and its big gap number counts up quickly from 0 (about 500ms). If only the numbers change for the same match, just count the gap number to its new value. Reduced motion: swap instantly. If no match today has a Polymarket market, hide this card.

**Day heading:** "Tonight", "Tomorrow", or the date.

**Match card (glass):**
- Top row, three columns: home badge and name | league and kickoff time | away badge and name
- Team badge: a 40px circle in the club's two colours with the first 3 letters (e.g. "ROM"). **No club crests or logos.** Colours come from football-data.org `clubColors`. Fallback: chalk on dark green.
- **Sliding odds:** three pills (Home / Draw / Away chances). The pills slide between the **Bookies** set and the **Polymarket** set every 3.2 seconds (520ms ease-in-out slide). A label above shows which source is showing (with its square or circle marker) and two small dots show the position. Bookies numbers are amber, Polymarket numbers blue. The slide pauses while the user touches the card, and doesn't run under reduced motion (show both sets stacked instead).
- Gap sentence: "Polymarket rates Roma 8 points higher than the bookies." or "They nearly agree. Only 3 points apart."
- No Polymarket market: show bookies pills only, plus "No Polymarket market for this game, so there's nothing to compare yet."
- Tapping the team row opens the card (only one open at a time). The opened card shows:
  - The **record** (below)
  - **Your call** (below)

**Record (who's been closer):** a dark `deep` panel, radius 20px.
- Label: "Who's been closer when they disagreed like this"
- Three columns: left "Bookies" (amber square) with a **big number** under it; middle "out of 14 Serie A games"; right "Polymarket" (blue circle) with its **big number**. Numbers: Archivo 800, 72px, tight letter-spacing, chalk.
- **The count animation:** when the page loads or the card opens, the numbers **count up in fast motion from 0** to the real record (0, 1, 2... 5 and 0, 1, 2... 9; "out of" counts to 14 at the same time). About 1 second, fast at first and slowing as it nears the final number. While counting, the numbers are slightly blurred to feel like they're rolling. When they land, each one does a quick pop and flashes lime for a moment. Then "+1 since last week" / "+3 since last week" fades in under each number. Runs once per open. Reduced motion: show the final numbers straight away.
- Bottom row: "Built from 14 games remembered on Walrus" and a small **"See them"** button. It opens the 5 most recent games behind the score: match and score, date, the Walrus memory ID as a link, and which source was closer (marker + "Polymarket closer"). Then a link "See all 14 on the Memory page".
- "Last week" means the record as it stood 7 days ago, so store or compute it. All games come from the **real Walrus recall**, not the database copy.
- Not enough history: "Not enough games like this yet. We'll show who's been closer once we have 10."

**Your call:** three full-width pills: "Roma win", "Draw", "Cagliari win". Selected pill uses lime-mint. Tapping triggers the real pick flow (sign-in prompt if logged out: "Sign in to make your call").

### 2. Stamp card landing with dust
Appears right under the Your call buttons after the user taps a call (e.g. "Roma win"), once the Sui transaction succeeds. While waiting, show a small "Stamping..." state on the tapped button. On failure, a clear error with "Try again".
- **Compact:** one row, about 56px tall. Don't let it take over the card.
- Contents, left to right: a 36px lime-mint circle with a check; "Locked: Roma win" (Archivo 700, 15px) with "Stamped on Sui at 3:42pm. Saved on Walrus." under it (12px, real time); a dark pill button **"View on Sui"** with an outward-arrow icon that opens the real transaction on the Sui explorer in a new tab: `https://suiscan.xyz/mainnet/tx/<digest>` (use the real transaction digest).
- **The landing (480ms):** the card drops from about 64px above with a slight tilt, **hits and squashes** (scale 1.03 wide, 0.93 tall, pivot at the bottom edge), bounces up 4px, settles. The Your call row above gives a tiny 2px "thud" at the moment of impact.
- **Dust (starts at 270ms, lasts 560ms):** about 12 small soft dots (4–6px, light grey, slightly blurred) burst out from the card's **bottom edge**, mostly from the two corners, spreading **sideways and slightly up**, growing a little and fading out. They must render **in front of** the card (z-index above it), otherwise they're hidden. Subtle: it should read as "it landed", not as smoke.
- Changing the call before kickoff = new stamp = the card lands again (remount it so the animation replays).
- Reduced motion: the card just appears, no dust.

### 3. Memory page
Linked from the bottom nav. This page exists so judges can **see** Walrus working.
- Back link "Coming up", title "Memory", one line: "Every game we check becomes a memory, saved on Walrus. Next time the bookies and Polymarket disagree, we look back at these."
- **Counter card** (lime-mint): the real total, e.g. "212 memories saved on Walrus", "18 new today", and "Check on Walrus" linking to where the memories can be verified.
- **How the scores changed:** one row per league: name, current score (bookies amber, Polymarket blue), and history "3 weeks ago 2-3, last week 4-6, now 5-9". Note under it explaining the order and the 5-point rule (use the real threshold).
- **Latest memories:** filter chips All / App memory / Your memory. A feed of real memory writes, newest first: Record updated, Result graded, Reading saved, Your call saved. Each shows a short detail, time, and "Remembered on Walrus, [memory ID]" as a link. The newest item gets one soft lime pulse when the page opens.

### 4. Bottom navigation
Floating pill bar fixed at the bottom of the screen, glass style. Items: Coming up (active: lime-mint pill with icon and label), Your calls, Memory, Profile/Sign in (icon only, each with `aria-label`). Stays clear of phone home bars (`env(safe-area-inset-bottom)`).

### 5. Sign-in page
- **Fully dark** background (`#040907`) with pitch markings barely visible (`#0E1A15`).
- **The floating footballs and kits are invisible in the dark.** They only appear, in full colour, inside the floodlight.
- **Floodlight:** a soft circle of light (**about 220px**) that turns the pitch green, lights the markings, and reveals the balls and kits in colour. Build it as one layer (green pitch + markings + floaters) revealed through a CSS radial `mask-image`.
- **Movement must be smooth, never jumpy:** run one `requestAnimationFrame` loop that eases the light toward a target point (about 22% of the distance per frame while the user is moving, 2% while idle). The pointer (mouse, or finger while dragging) sets the target. When the user stops or lifts their finger, **the light stays where they left it.** After 2.5 seconds with no input, it starts wandering slowly from that exact spot, so there's no jump back to the top. Set the mask position directly on the element (via a ref), not through React state, so it doesn't re-render 60 times a second.
- **Make them look 3D, not flat:**
  - Balls: classic patch pattern, a radial shading overlay (light top-left, dark bottom-right), a small white highlight, and the **patches rotate inside the ball while the shading stays fixed**, so it looks like a spinning sphere.
  - Kits: a left-to-right shading gradient for cloth volume, two faint fold lines, and they **sway in 3D** (`rotateY` ±28° with `perspective: 700px`) as they float.
  - Depth: far items are smaller and slightly blurred (1–2.5px), near ones bigger and sharp, all with a soft drop shadow underneath.
  - Everything bobs slowly (7s, 9s, 11s loops).
- Kits are plain generic shirts in made-up colour pairs with a number. **No real club kits, no logos, no players.**
- **Glass panel** in the centre: `[App name]`, heading "See who's been right before you pick.", line "Bookies vs Polymarket on every big game, and a record of your own calls. Free, no wallet needed.", buttons "Continue with Google" (chalk) and "Continue with email" (glass), link "Just looking? Browse games". The panel uses `backdrop-filter: blur(18px)` so the floodlight doesn't distract while reading.
- Hook these buttons to the existing Supabase sign-in. Don't change the auth logic.

## Assets: hard rules
- **No real player photos.** No player names or faces in images.
- **Club crests: Maverick has confirmed, use the real crests for every team.** Get them from football-data.org's team `crest` field. To avoid mistakes:
  - Match crests by **football-data.org team ID**, never by team name. The odds service and Polymarket spell names differently ("Man City", "Manchester City FC"), so reuse the data job's team matching to link each match to the right football-data.org team ID.
  - Store each team's crest URL in the database once (when the team is first seen), not on every page load.
  - Write a check script that lists every team in every covered league with its crest URL, and flags any team with **no crest, a broken URL, or no team ID match**. Run it and fix every flagged team before the UI is done. Show Maverick the list.
  - Show crests at 40px, `object-fit: contain`, on a soft circle background so they look consistent on the dark UI.
  - If a crest fails to load, fall back to the two-colour initials badge automatically. Never show a broken image.
  - Every crest image has `alt` text with the team name.
  - Add a line in the README: "Club crests belong to their clubs and are shown only to identify teams."
- **No real kit designs** on the sign-in page. Club colours are fine.
- **No Polymarket or bookmaker logos.** Use the words and the square/circle markers.
- Everything is CSS or inline SVG. No image downloads.

## Wording
Keep everything already agreed in CLAUDE.md ("Coming up", "Your call", "Bookies vs Polymarket", "You called it" / "Not this time", "Your calls"). Write any new text like a football fan talking to a friend. Show Maverick new text before finalising.

## Mobile checks (must pass before the UI is done)
Many users will be on mid-range Android phones on mobile data. Test for that, not just a laptop's phone view.
- **Narrow screens:** check at **360px** and 390px wide (360 is common on Android). No text cut off, no sideways scrolling except the league chips. Three "Your call" buttons with long names (e.g. "Wolverhampton win") must still fit: shorten to the short team name if needed.
- **Touch:** every button and link at least 44px tall. Tapping a match row, a pill, "See them" and "View on Sui" all work with a thumb.
- **Phone edges:** respect `env(safe-area-inset-*)` so nothing hides under the notch or the home bar. The bottom nav sits above the home bar.
- **Sign-in floodlight:** follows a dragging finger smoothly, doesn't scroll or zoom the page while dragging (`touch-action: none` on that area only), and the buttons in the glass panel still tap normally.
- **Speed on a mid-range Android:** blur (`backdrop-filter`) and masks can be slow on cheaper phones. Check that scrolling stays smooth. If it stutters, lower the blur amount or use a solid background instead of blur on Android.
- **Browser support:** use both `-webkit-mask-*` and `mask-*`, and `-webkit-backdrop-filter` with `backdrop-filter`. Test in Chrome on Android and Safari on iPhone.
- **Slow data:** with the network throttled to "Fast 3G" in DevTools, the page should show real content (or a simple loading state) within about 3 seconds. Fonts must not block text (`display=swap`).
- **Real phone:** after deploying, open the live site on Maverick's own phone and go through every screen once.

## Done when
- Every screen matches the reference at 390px and looks good on desktop
- All existing tests pass, nothing about how the app works has changed
- Reduced motion turns every animation off
- Keyboard focus is visible on every button and link
- Text contrast is at least 4.5:1
- The live site loads real content in about a second on a phone
