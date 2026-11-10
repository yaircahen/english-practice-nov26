# Hey! Unit 1 game — how to run and deploy

Design: `prd.md`. Static web app, no build step, no backend.

## Files

| File | What |
|---|---|
| `index.html` | the page shell; bumps `?v=` on every milestone so iPad caches refresh (M2 = `2.0.0`) |
| `styles.css` | reading-friendly styles |
| `content.js` | the 50 words, lands, skins, Leitner intervals; from M2 also the grammar units, same/different cards, writing lists, stories and the tap-for-Hebrew glossary (data only) |
| `app.js` | engine, session loop, screens, coach screen; from M2 also the grammar cards, the writing track and the story track |
| `prd.md` / `prd-v3.md` | the design (v4) and the previous version |
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

## Coach screen (hidden)

On the map, press and hold the small ⭐ counter (top left) for 2 seconds. The first time, you
set a 4-digit parent PIN; after that it asks for it. Nothing on screen hints at this. Export the
save from there once a week. The PIN can be changed from the coach screen; a full reset clears it.

## Reset the game for a fresh day-0 (e.g. after testing on the Mac)

Coach screen → "איפוס מלא" (full reset). Or in the browser console: `localStorage.clear()`.
