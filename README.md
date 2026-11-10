# Hey! Unit 1 game — how to run and deploy

Design: `prd.md`. Static web app, no build step, no backend.

## Files

| File | What |
|---|---|
| `index.html` | the page shell; bumps `?v=` on every milestone so iPad caches refresh (M2 = `2.1.0`) |
| `styles.css` | reading-friendly styles |
| `content.js` | the 50 words, lands, skins, Leitner intervals; from M2 also the grammar units, same/different cards, writing lists, stories and the tap-for-Hebrew glossary; from 2.1.0 the loot catalogue, the reading-minute sentences and `copy`, the table of every line the kid reads (data only) |
| `app.js` | engine, session loop, screens, coach screen; from M2 also the grammar cards, the writing track and the story track; from 2.1.0 the mystery box and wardrobe, streak freeze, brag card, reading minute and letter-tile cards |
| `prd.md` | the design (v4): the one to build from |
| `archive/prd-v3.md` | the previous version of the design, kept as written for the record |
| `.claude/launch.json` | local dev server definition (uses the venv) |
| `.venv/` | Python venv; only used for the local static server |

## Run locally (Mac)

```bash
.venv/bin/python -m http.server 8765 --bind 127.0.0.1
```

Then open http://localhost:8765 . In the Claude desktop app the "game" preview does the same.

## Try it on the iPad before publishing (optional)

Same Wi-Fi, Mac awake:

```bash
.venv/bin/python -m http.server 8765 --bind 0.0.0.0
```

On the iPad open `http://<mac-ip>:8765`. Progress saved there is tied to that address and will
not carry over to the published URL; export it from the coach screen if it matters.

## Publish (GitHub Pages, manual, personal account)

Do this from a terminal that is logged in to the **personal** GitHub account, not from Claude
Code (the `gh` CLI on this Mac is the work account).

1. Create a new **public** repo with an unguessable name (e.g. `wq-7f3k9`). No README.
2. From this folder, push just the app files:

```bash
git init -b main
```

```bash
printf '.venv/\n.claude/\n*.md\n' > .gitignore
```

```bash
git add index.html styles.css content.js app.js manifest.webmanifest icons .gitignore && git commit -m "M1"
```

```bash
git remote add origin git@github.com:<personal-user>/<repo>.git && git push -u origin main
```

3. In the repo: Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
   Wait a minute; the URL is `https://<personal-user>.github.io/<repo>/`.
4. On the iPad: open that URL in Safari, tap Share → **Add to Home Screen**. The icon opens the
   game full-screen. Progress lives in that home-screen app; do not open the URL in a different
   browser and expect the same save.
5. Each later milestone: commit, push. The `?v=` stamps in `index.html` are bumped per milestone
   so the iPad picks up the new files. If a change does not appear, pull down to refresh once.
   If a file is changed again after a version has already been opened somewhere, bump the three
   stamps once more: a browser keeps the old file for as long as the stamp is the same.

## What M2 added (10 Nov, test-facing part)

- **Grammar towers** open one unit a day in parent sessions, once land 2 is in: to be, has/have,
  negatives and questions, then Wh-questions and a/an/some. The same/different cards open with land 4.
- **Writing**: two sentences a session once the first tower is open. Tiles first; from the second
  writing day the mission screen says "להכין עט ודף" and he copies, then writes, on paper. He checks
  each sentence against three points and taps ✓ or "again".
- **Stories**: one new friend a day in parent sessions (five passages so far); a solo session
  revisits the last one. Support level and writing rung can be moved from the coach screen.
- An M1 save carries over as is. Nothing in the save format was removed.

To check on the iPad before he plays: the voice in the stories (level 1 reads each sentence
aloud and lights it), that the tiles are comfortable to tap, and that the "tall / short"
pictures show two figure sizes next to a door.

## What M2 added (10 Nov, game part, v2.1.0)

- **Mystery box** at the end of every mission, alone or with a parent: one find a day, common, rare
  or golden, for the hero (hat, companion, glow), the map's trail, the confetti, the sound of a right
  answer and the frame of the friend cards. It changes looks and sounds only. A land or tower whose
  cards are all in Box 4–5 adds a rare find; the 🎁 on the map marks the ones still waiting.
- **Wardrobe**: tap the hero on the map, or the button under "זהו להיום". It opens once the day's
  mission is done, like the training grounds.
- **Streak freeze**: one missed day a week is frozen by itself (the 🧊 next to the 🔥 shows it is
  still unused). Two missed days in a row end the streak unless the coach screen's freeze button
  is used (illness, a trip).
- **Brag card**: "📣 כרטיס להשוויץ" on the closing screen and on the map makes a picture of the
  day's numbers. On the iPad it should open the share sheet; where it cannot, the picture stays on
  screen to save.
- **Reading minute**: in a parent session with time left after the story, three sentences to read
  aloud. The parent taps ✓ or 🔁 per sentence and does not correct mid-sentence. The marks are
  kept on the coach screen only; "לדלג" skips it.
- **Letter tiles**: when a word's meaning card reaches Box 3 it gets a "build it in English" card,
  at most three a mission (`tileCap` in `content.js`).
- **Wording**: every line the kid reads is in `copy` at the end of `content.js` and can be edited
  there. The rules for that voice are written above the table.
- A save from 2.0.0 or from M1 carries over as is; the new fields get their defaults.

Not in this version: the 👍/👎 question at the end, the golden card, tile cards in the training
grounds.

Played only in the Mac browser at iPad size. To check on the iPad before he plays: that the brag
card opens the share sheet and the picture arrives whole (WhatsApp), that hats and companions sit
right on the hero (they are emoji, and older iPadOS versions lack a few), that the box opens
smoothly, the alternative answer sounds, and that the letter tiles are comfortable to tap.

## Coach screen (hidden)

On the map, press and hold the small ⭐ counter (top left) for 2 seconds. The first time, you
set a 4-digit parent PIN; after that it asks for it. Nothing on screen hints at this. Export the
save from there once a week. The PIN can be changed from the coach screen; a full reset clears it.

Added in 2.1.0: the reading-minute log, the letter-tile count, the streak with its frozen days and
the freeze button, and the loot count with a switch between a box after every mission and after
every second one (for when he starts asking what he gets before he begins). "איפוס המשימה של
היום" now also takes back the loot found today.

## Reset the game for a fresh day-0 (e.g. after testing on the Mac)

Coach screen → "איפוס מלא" (full reset). Or in the browser console: `localStorage.clear()`.
