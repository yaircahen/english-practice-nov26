# Hey! Unit 1 game — how to run and deploy

Design: `prd.md`. Static web app, no build step, no backend.

## Files

| File | What |
|---|---|
| `index.html` | the page shell (now `3.5.2`); bumps `?v=` on every milestone so iPad caches refresh (M2 = `2.1.0`, M3's test-facing half = `3.0.1`, joined with the same-day parent session and the reachable ⭐ of `2.3.0` = `3.1.0`) |
| `styles.css` | reading-friendly styles |
| `content.js` | the 50 words, lands, skins, Leitner intervals; from M2 also the grammar units, same/different cards, writing lists, stories and the tap-for-Hebrew glossary; from 2.1.0 the loot catalogue, the reading-minute sentences and `copy`, the table of every line the kid reads; from 3.0.0 the bonus land, the word-bank sets, the sentence halves, the listen-and-pick cards and the listening questions (data only) |
| `app.js` | engine, session loop, screens, coach screen; from M2 also the grammar cards, the writing track and the story track; from 2.1.0 the mystery box and wardrobe, streak freeze, brag card, reading minute and letter-tile cards; from 3.0.0 the mid-boss, the sets, the listening player and the two-sitting quest |
| `paper.html`, `papers.js` | the printed papers in the teacher's shape (v4.1): `paper.html?n=1` is paper 1 (5 pages, A4), `&view=key` its answers (2 pages), `&view=coach` one page for the parent, with the working method and the seven secret phrases for the seals. `papers.js` holds papers 1–5; the game reads none of it |
| `mock.html` | the printable mock (M4): the test, the answer key and a page for the coach. It reads `mock` in `content.js` and nothing else |
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
   The command above lists the M1 files only. A published copy also needs `mock.html` (M4) and,
   from 19 Nov, **`paper.html` and `papers.js`** (the printed papers). If the published repo is
   this one, served from `main`, they are there already.
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
  cards are all in Box 3–5 adds a rare find; the 🎁 on the map marks the ones still waiting.
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

## What M3 added (12 Nov, the test-facing half, v3.0.1)

Everything below opens by itself from the save's state, as before. "Day 6" means the first parent
session on a day after the last of the 50 words came in.

- **Mid-boss** (day 6): the day's review, in the test's five sections, 20 answers: four listen-and-pick
  cards, a word-bank set, four grammar cards (has/have twice), a sentence-halves set, two sentences
  built from tiles. He sees a boss losing one life per right answer. The tally by section and a
  number by the test's weights are on the coach screen only.
- **Bonus land** (days 6 and 7): a side path on the map. Twelve number words (word → digits, and
  the look-alike pairs such as thirteen / thirty also as listening cards), then six months and six
  picture adjectives. `fat` and `nice` have no clear picture, so they are meaning cards.
- **Word bank and sentence halves**: from day 7 the review opens with a word-bank set of five and
  holds a sentence-halves set of five. The ten word-bank sets hold each of the 50 words once, in
  the form the sentence needs (`washes`, `months`).
- **Word-in-a-sentence cards**: each of the 50 words gets one, with its word-bank sentence, once
  its meaning card is in Box 2. At most six a mission (`clozeCap` in `content.js`).
- **Listening**: a recording on day 6, then one in each parent session after it (every second
  one until 15 Nov): Honey, Robo-Pets,
  Splash and Sandy. He hears it once with nothing else on screen, answers, then hears it again
  with the questions in view. Each one adds a pet card. The recordings play from ECB's address
  and need Wi-Fi; nothing of them is in this repo. If one does not load, a short dialogue in the
  device's voice takes its place and the recording waits for the next parent session.
- **Two sittings**: on a mid-boss day or a recording day, a parent session first asks "cards
  first, the rest later" or "all in one go". The cards sitting stops at 10 minutes (12 on the
  mid-boss day) and leaves the quest half done on the map; the second sitting holds the writing,
  the story and the listening, and ends with the box. A session alone on such a day is the cards
  sitting, and ends with the code. A half left open overnight still counts as that day's quest.
- A save from 2.1.0 or earlier carries over as is.

- **Long stories** (from day 8): four passages of 13–14 sentences in three paragraphs, two friends
  side by side (C1–C4; C5, the unseen one, comes with the mock in M4). Up to support level 3 a long
  story is shown one paragraph a screen, each followed by its own two questions. New question
  kinds: "how does the sentence go on" (four endings) and "write two things" (he taps the two
  sentences; from level 4 he writes them on paper and checks against the story).
- **Support levels 4 and 5** (parent sessions only): 4 = reads alone, word taps shown as a small
  number; 5 = reads aloud while the parent marks each sentence (that day has no reading minute).
  The coach screen's two story buttons now move between 1 and 5.
- **Each story is met three times**: new; two missions later as a second visit, one level higher
  (a long story: one paragraph, his pick); and later once more as a 20-second "warm read" at the
  start of a mission. Reading times are kept per paragraph. He is told only when a paragraph's
  best time falls; the times themselves are on the coach screen.
- **Level 3 "find it"**: after a right answer he taps the sentence that holds it.
- **A question whose answer had to be shown** comes back at the next mission, before the day's
  story. If the answer has to be shown again, the coach screen lists that question.
- **Five reading tips**, one before each new story (from level 2) until all five were shown.

Not built from the PRD's story track: at level 4 the questions still come one at a time (the PRD
wants them all on one page, as on the test; M4's test mode has that look), the "hear the whole
paragraph" button at level 4, and the read-along days. M3's second list (trophy shelf,
tricky-word flow, own-sentence cards, the training grounds' drills) is not started.

To check on the iPad before day 6: that the three recordings start within a few seconds and play
to the end (coach tip: `test.html` on the Mac has a "day 6" and a "day 8" save); that the fallback
dialogue's two voices can be told apart; that the door-and-figure pictures for `tall` and `short`
show; that the word-bank and halves sets are comfortable to tap; that in a long story the
sentences are easy to tap for "write two things".

## What M4 added so far (15 Nov, the mock, v3.3.0)

Built first of M4's test-facing list, because it is the one piece that works on paper even if every
screen after it slips. The rest of the list (the five-sentence writing task, unheard dialogues in
the quest, the test-mode screen, the final boss) is not built yet.

- **`mock.html`** is the day-12 mock (prd.md §6.4). It follows the scan of the practice copy task
  by task: the same sections, the same tasks in the same order, the same number of items and
  choices, the same points, and the same nine sheets. The content is all new: ten names the
  practice copy and the game's stories do not use, new pictures, an unseen passage (C5, "Ella and
  Yoni": first person, three paragraphs, 21 sentences, 136 words) and an unheard dialogue (Yael and
  Noam, 12 lines).
- **Three views**, each printed on its own with the "הדפסה" button, on A4:
  `mock.html` is the test (9 pages), `mock.html?view=key` the answer key (1 page),
  `mock.html?view=coach` the pages for the coach (how to run it and the listening text; the
  points). The coach screen links to all three.
- **Listening**: "האזנה 1" and "האזנה 2" in the bar speak each part twice in the device's voices,
  the dialogue in two voices as in the game. If the voices are not clear, the text to read aloud
  is on the coach's page.
- **No printer**: the test view on the iPad and answers on plain paper; copy the passage (page 7)
  out by hand, as §6.4 says.
- **The content** is `mock` in `content.js`, kept apart from `stories` and `listening` so that the
  game never shows the passage or plays the dialogue before the mock. The final boss will read the
  same data.

How it was made, and what to look at before he sits it:

- The first version was laid out from prd.md §4.4 alone. It was then rebuilt against the scan of
  the practice copy (the scan itself is publisher material and stays out of the repo). What the
  scan changed is listed in prd.md §4.4, with the gaps it shows between the test and what the game
  trains.
- The Hebrew and Arabic instruction lines are modelled on the practice copy's. The Arabic was not
  read by an Arabic speaker.
- The people in the writing picture are line drawings and print the same anywhere. The dog, cat,
  ball, book, flowers and the listening pictures are emoji: they come out in the printing device's
  own style, and on a black-and-white printer in grey. The practice copy's pictures are drawn
  scenes; these are simpler.
- Checked in the browser only: the three views as A4 PDFs (9, 1 and 2 pages), no sheet running
  over, the shape of every task against the practice copy's, the player's order and its stop
  button against a stand-in voice, the fit on an upright iPad, the game still starting from the
  day-8 sample save. **Not tried on the iPad or on a real printer; the real device voices were not
  heard.**

## What 3.6.0 added (17 Nov: the five-sentence task and test mode)

Two more items of M4's test-facing list, and the second unheard dialogue. The final boss and the
"then" list are still not built.

- **Writing rung 5, the test's own task.** One picture of six labelled people in five groups (one
  pair), a bank of ten bare words (four adjectives, six nouns, one of them spare), and five
  sentences to write on paper: two with *is / are*, three with *has / have*. No frame is shown.
  "העט על השולחן" shows what could be written about each group, four checks, and a ✓ or 🔁 for each
  of his five sentences. Rung 4 moves up to rung 5 after three clean parent sessions, like the
  rungs before it; the coach screen's rung buttons now reach 5. At rung 5 the writing is planned at
  6 minutes instead of 3.
- **Test mode: a whole sitting on paper** (prd.md §6.4, day 11). It opens by itself, once, in the
  first parent session from 19 Nov (`testModeFrom` in `content.js`). The coach screen has a button
  to open it today or to shut it. It is about ten short sheets in the test's order, each black on
  white in a plain font, with nothing to tap and no hints:
  Listening 1 (five sentences, six pictures), Listening 2 (a dialogue he has not heard), Vocabulary
  1 (ten words to match, half from outside the 50), Vocabulary 2 (a word-bank set), Grammar 1–3
  (am / is / are, the right form of three, have / has), Reading 1 (halves joined by meaning),
  Reading 2 (the next story he has not met, whole, with all its questions under it) and Writing
  (the five sentences). He writes on his own paper. After each sheet "העט על השולחן" shows the key
  and he marks every line ✓ or 🔁 with the parent beside him.
  - The points per sheet are the test's, so a full run adds up to 20 / 20 / 20 / 30 / 10.
  - The marks move the cards: a miss takes the card down a box; a right answer takes it up when the
    card was due. The words and grammar items are drawn from the lowest boxes first.
  - He sees a count of right answers at the end, with no total and no score. The points by
    section and the estimate out of 100 are on the coach screen only.
  - There is no hard stop. A solo session on that day is an ordinary one, and the day is not
    offered in two sittings. The story and the dialogue count as met and heard afterwards.
  - Leaving in the middle keeps the marks of the sheets already checked and offers test mode
    again next time.
- **A second unheard dialogue** ("Noa and Omer", 12 lines, six questions in the practice copy's
  order). It follows "Maya and Dan" in the listening track; test mode takes whichever comes next.
- `test.html` has a **day 11** save: test mode set to open today, writing at rung 5.

Checked in the browser at iPad size (820×1180) from the day-11 sample save: a whole test-mode
sitting to the close screen, rung 5 inside an ordinary quest, the date rule (18 and 19 Nov on a
fixed clock), the coach screen, and the older sample saves still starting. **Not tried on the iPad;
the device voices were stubbed.**

## What 3.7.0 added (17 Nov: the rest of M4)

M4's last test-facing item and its "then" list. With this, everything on M4's list is built.

- **The final boss** (prd.md §8, day 12) is the mock inside the game: the same content as
  `mock.html` (`mock` in `content.js`), ten sheets, in the printed order and with the printed
  letters. With a printed copy he writes on it, and the screen plays the listening and moves along
  with him; without a printer he reads from the screen and writes on plain paper.
  - It opens once, in the first parent session from 20 Nov (`finalBossFrom` in `content.js`). The
    coach screen has a button to open it today or to shut it. That day is not split into two
    sittings, and a solo session on it is an ordinary one.
  - Unlike test mode, the whole test comes first and the keys only at the end, sheet by sheet;
    "לדף הקודם" goes back while he is still writing. Every ✓ is a hit, and the boss's bar empties
    as the keys are marked. The points are the mock's own: 100 in all.
  - He sees the number of hits. **The score out of 100 is on the coach screen only**, with the
    points by section and the lines to go over.
  - A miss on a word he has a card for takes that card down a box. A miss in a grammar task puts
    two cards of that form first in the next review.
  - The boss leaves a golden item in the box. On the map his node shows the gate as a percentage
    (cards in Box 3 and up, toward 80%) until the day, then "the gate is open", then a flag.
  - After the boss the coach screen offers to sign the "ready" badge (day 13); the map then shows
    🎖️. Test mode no longer opens once the boss has fallen.
- **His own card, "about me"** (prd.md §6.5): card 14. Once, in a parent session that is not a
  test day, a boss day or the mid-boss day, it takes the place of the two sentences. He copies
  five template lines onto paper and fills the gaps in his own words; a parent types what he
  wrote; the app reads it back and the paragraph becomes his card, first among the friends on the
  map. Tapping it there opens it again, to hear it or to correct the typing. "לא היום" leaves it
  for the next parent session. It needs writing at rung 3 or higher.
- **Speed round** (prd.md §6.3 item 7): a button on the map after the day's quest, once 12 of the
  50 words are mastered. 60 seconds, meanings only, words whose Recognition card is in Box 3 or
  higher. No card moves, whatever happens; a best is announced only when it is beaten; the minute
  counts in the training grounds' daily cap.
- `test.html` has a **day 12** save: the final boss set to open today.

Checked in the browser at iPad size (820×1180): the boss from the day-12 save to the close screen
and the map after it, the speed round, the card written inside a quest and reopened from the map,
the coach screen's sections, the date rules on a fixed clock (19 Nov test mode, 20 Nov the boss),
and the older sample saves still starting. **Not tried on the iPad; the device voices were
stubbed, and the fields were typed into from a desktop keyboard.**

## What 3.9.7 added (20 Nov: words in disguise)

- **🎭 Words in disguise**, a short round on words that pass for other words: friend, week, month and the
  month names, numbers (13/30, 15/50, forty), year vs age, at vs eat (two of them heard, not read), with, and be.
  One question from each of the eight topics and two more, ten in all; a miss comes back once at the end.
  After each answer the whole sentence is shown with its Hebrew and the word's trick.
- Untimed and free play, like the speed round: no card moves and no meter. Its time counts in the parent's cap.
  It opens from the map once the day's quest is done, and from the training grounds' second row.
- Questions are `tricky` in `content.js` (own sentences); runs are kept in `state.tricky.runs` and the log.
  Drive it with `__game.startTricky()` and `__game.tricky`.

## What 3.9.6 added (19 Nov: the quest moves the meters)

A quest now counts towards the sections' levels (`prd.md` §7.8). When at least five cards of a
section came up in a quest (`sectionQuestMin`) and every one was right at the first try, that
section rises one level, inside the same limit of three a day. A toast on the close screen
names the sections that rose. Boxes are untouched by this, and a quest with a miss changes
nothing he can see. The quest still plays cards, not the new sets.

## What 3.9.5 added (19 Nov: seals)

The one link from paper to the game (`prd.md` §6.4). Under the eight tiles is "יש לי משפט סוד":
he types the phrase a parent gave him for a clean task on a printed paper, and that section's
tile takes a seal (`state.secs[id].seal`, the date).

- The phrases are `seals` in `content.js`, one for each of the seven sections that are test
  tasks, and the same ones are printed on the papers' coach page (`seals` in `papers.js`).
  **Change both together.** `state.settings.seals` overrides them, but the coach screen has no
  field for it yet.
- Spaces, punctuation and final-letter forms are ignored when the phrase is compared.
- A wrong phrase changes nothing and is not counted against him.
- The seal screen is inside the training grounds, so it is reachable only when they are open
  (after the day's quest, within the cap).

Checked in the browser from the day-11 sample save. Not on the iPad.

## What 3.9.4 added (19 Nov: the reading section)

The eighth tile of the training grounds is open (`read`, `prd.md` §6.5). A run is one story
from `readStories` in `content.js` (R1 "The Kite", R2 "The Cake", in turn).

- Each paragraph is its own screen, with one check under it: "what happened here?" and three
  lines in Hebrew. The right line opens the next paragraph; a wrong one greys out.
- Then five questions. For each he taps the paragraph that holds the answer, then the sentence
  that answers it. A wrong first tap on a sentence is the run's miss; paragraphs and checks can
  be tried again freely.
- No read-aloud, no clock, and no pen: writing the answer is for the printed papers.
- **Not yet as in the PRD:** no tap-for-Hebrew on a word; a wrong check does not light the
  sentence that decides it; a "why" answer is a tapped sentence, not built from tiles; stories
  D1–D3 for the quest and the boss are not written; the old stories still read as before.
- A run is `__game.practice.set` with `kind: 'read'`: `stage` (`para`, `q`), `pi`, `qi`,
  `step` (`para`, `sent`), `gist`, `miss`.

Checked in the browser from the day-11 sample save. Not on the iPad.

## What 3.9.3 added (19 Nov: the sorting sets)

Three sections of the training grounds now play a set, not ten cards (`prd.md` §6.2, §7.8):

- **The pronoun table** (`pron`): ten nouns from `sortPron`, at least one for each of the six
  columns. **The a/an/some sort** (`art`): four, three and three words from `sortArt`.
  **The word bank** (`bank`): one of the ten fixed sets with two spare words and, in nine of
  them, a sentence whose blank opens it (`bankSpare`; `wb3` has none).
- He taps a word and then its place, and can move it again. Nothing is checked until "done".
  When every place is taken the screen says "second look" and shows the "done" button.
- A set with no wrong place is a clean run and takes the level up. A word first put in a wrong
  place, moved, and the set finished clean gets its own line and more confetti. That is all the
  second look earns so far: the "small find" of the PRD is not built.
- No card moves box, and a miss in a set demotes nothing (the PRD's rule for sets in a quest
  is not built: the quest does not use these sets yet).
- A run is `__game.practice.set`: `tiles` (`home`, `at`, `first`), `boxes`, `stage`
  (`work`, `look`, `checked`), `wrong`, `lookWin`.

Checked in the browser from the day-11 sample save. Not on the iPad: the tap targets and the
six columns need a look on the real screen.

## What 3.9.1 added (19 Nov: the training grounds in eight sections, first version)

The training-grounds button on the map now opens eight sections in the test's order (`sections`
in `content.js`, `prd.md` §7.8). Each has a level from 0 to 5.

- A run is ten cards from the section's pool, the lower boxes first. A run with every card right
  at the first try takes the level up one, three times a day per section at most (two in 3.9.1). A level never goes
  down, and no card moves box: this is still free play.
- A section's first level is seeded from his save: the share of its cards in Box 3 and up, to 3.
- **Not yet as in the PRD:** the word bank, the pronoun table and the a/an/some sort are still
  four-choice cards, not sets; the reading section is shut ("opens tomorrow"); the quest does
  not move the meters; no crests, seals or second look.
- Handles: `__game.openGrounds()`, `__game.startSection(id)`, `__game.secState(id)`; a run is
  `__game.practice` with `sec`, `secN`, `secMiss`. Ids: `words, bank, be, have, art, read, pron, wh`.

Checked in the browser from the day-11 sample save (a clean run, a run with a miss, the
two-a-day rule). Not on the iPad.

## What 3.9.0 changed (19 Nov: the teacher's test)

The real test follows the teacher's example, not the publisher's practice copy (`prd.md` §0.1).
This is the first, small step.

- `parked` in `content.js` keeps listening, picture writing and sentence halves out of the daily
  quest. Nothing is removed: recordings replay from their pet cards, and his "about me" card
  still opens if it is not written yet.
- `testModeFrom` and `finalBossFrom` are empty, so test mode and the final boss no longer open
  by date. The coach screen can still open either.
- 24 new grammar items: has/have with pronoun subjects (`u2-9` to `u2-16`), noun→pronoun of the
  kinds in the test's table (`np-10` to `np-17`), single-word a/an/some (`u4b-7` to `u4b-14`).
  A session gives each a card if its unit is already open, in Box 1 with priority, so they play
  first.

Checked in the browser from the day-11 sample save. Not on the iPad.

## What 3.8.3 changed (18 Nov: the sitting alone comes first)

On the mode screen the parent button stays locked until the day's sitting alone is done; the sitting
alone carries the review, so the parent sitting keeps its time for the new land and the long forms.
On a long day the solo sitting is the cards half and the map then offers the second half; on the
paper day and the boss day it is an ordinary solo quest and the map then offers the parent one.

- The rule is off on a day with nothing to play alone (the first day, every card resting) and on a
  day when the map would offer no parent sitting after the solo one.
- A parent can switch it off on the coach screen (`settings.soloFirst`, on unless `false`).
- Only the buttons ask. `__game.startSession('parent')` still starts a parent session directly;
  `__game.soloFirstDue()` says whether the lock is on.

Played in the browser from the owner's 17 Nov save on clocks fixed to 18, 19 and 20 Nov. Not on the iPad.

## What 3.8.2 changed (17 Nov: after the day-11 save)

The day-11 save showed the review stalled: 328 of 334 cards due, and land 7 opened with none of its
cards played. The two sets took about 9.5 of the cards sitting's 10 minutes.

- **Sets are off the cards' clock.** The time inside a word-bank or halves set no longer counts
  toward the stop (`session.setMs`), and the sets no longer shrink the review stack. A cards sitting
  is therefore 10 minutes of cards plus the sets, so it runs longer than before on the clock.
- **An opened land plays its first round.** Once a land's intro is shown, each of its new cards is
  played once even if the time is up; only the second tries of missed cards give way.

Played in the browser from the owner's 17 Nov save on a clock fixed to 18 Nov, with two 5-minute
sets: 52 review cards, both sets, and all 12 cards of land 8. Not on the iPad.

## What 3.8 added (17 Nov: after the day-10 save)

- **Sentence halves first.** A halves set opens the review (the word bank comes a few cards in); a
  single-sitting day plays halves only. A halves set with a miss comes back whole as the next halves
  set, at most twice (whole, because each meaning set was checked as a set).
- **Getting ready for a recording.** A new recording opens with a list (the table, a pencil and a
  page, a parent), "I'm ready", "are you sure?", then 3-2-1, and plays by itself. **Check on the
  iPad:** the tap on "are you sure" primes the audio so it may start after the countdown; if Safari
  refuses, the session falls back to the spoken dialogue.
- **Replays.** The pet chips on the map (🎧) play a heard recording again, with its questions, after
  the day's quest. No run is logged.
- **Serendipity** (prd.md §7.6): golden cards, a hidden find a day in the training grounds, a party
  every 10 right in a row and a find for the day's first 15 in a row, a streak card on the close
  screen, a glowing 🔥 on the map, and a rare find on streak days 3, 5, 7, 10, 12, 14. Numbers in
  `surprise` in `content.js`.

## What 3.4.0 changed in the game (15 Nov, after the scan of the practice copy)

Two of the five gaps that prd.md §4.4 lists between the test and what the game trains:

- **The writing bank is bare.** On paper (rung 4) the bank shows `dog`, not `a dog`, as the
  practice copy's bank does. Two nouns were added that are written without `a`: `flowers` and
  `money` ("Omer has flowers."). They come up on every rung, tiles included. The third check on
  the "בודקים יחד" screen now says "`a` לפני `dog`" or "בלי `a` לפני `flowers`".
- **C3 and C4 are retold in the test's style.** One of the two friends speaks in the first
  person: three paragraphs, 20 sentences, 147 and 137 words, with `like to`, `want`, `can` and
  `don't`. The friends, their cards and the order of the stories are the same. The questions are
  the test's kinds, with `same` or `different` in every true-or-false. C1 and C2 are unchanged.
  A save in which C3 or C4 was already read keeps its stars and card; a re-read shows the new text.

Played in the browser from the day-8 sample save: the writing minute at rungs 2 and 4, and each of
the two stories at support levels 1, 3 and 4, every question answered as marked with no hint.
**Not tried on the iPad.**

## What 3.5.0 changed in the game (15 Nov, the other three gaps)

The three gaps of prd.md §4.4 that 3.4.0 left open. Main (3.3.1: the automatic backup, the coach
screen fix) was merged in first.

- **Sentence halves joined by meaning.** Six fixed sets of five (`halvesMeaning` in
  `content.js`), in which the grammar does not give the ending away, as on the practice copy.
  Two halves sets of every three in the review come from them; the third is drawn from the old
  families. Each set was checked by hand, pair by pair; the rule for writing one is in the
  comment above them.
- **Listening in the test's form.** Every question to complete has four endings in words, with
  no picture beside them, and the Yes / No lines are statements. Every question, right answer
  and wrong ending of the three recordings was checked against the owner's transcripts (15 Nov,
  v3.5.1). The last question of the third recording now asks for a reason, as the practice
  copy's listening does.
- **One unheard dialogue** ("Maya and Dan", `dlg1`): 12 lines in two device voices, and six
  questions in the practice copy's order. It is the listening item after the three recordings,
  and it needs no day of rest before it.
- **Four choices** on the stories' Wh-questions (nine questions, A1 to C2).
- **Land 8: twelve everyday words** (`flower, now, today, night, week, kids, sister,
  grandmother, money, small, want, buy`) on the bonus land's side path. One meaning card a word,
  with a placement round. It opens the day after land 7 and **only until 18 Nov**; after that it
  stays shut. It costs a round of about three minutes on one day and up to twelve more cards in
  Box 1 for a few sessions, during which some stronger cards of the 50 wait a session
  (prd.md §4.1d). Eight sentences with these words joined the reading minute.

Played in the browser from the day-8 sample save: nine halves sets in a row, each solved by its
own pairs; the dialogue and the three recordings' questions (the recordings against a stand-in
file, and the fallback dialogue against a failed load); C1, C2 and A1; land 8 opened, introduced
and played, and shut on 19 Nov. **Not tried on the iPad.**

## Coach screen (hidden)

On the map, press and hold the small ⭐ counter (top left) for 2 seconds. The first time, you
set a 4-digit parent PIN; after that it asks for it. Nothing on screen hints at this. Export the
save from there once a week. The PIN can be changed from the coach screen; a full reset clears it.

Added in 3.3.0: "המבחן לדוגמה", three links to the mock: the test, the key and the coach's page.

Added in 3.0.0: the mid-boss by the test's five sections, the misses inside the word-bank and
halves sets, the listening log, and on a day played in two sittings the first sitting's code.

Added in 2.1.0: the reading-minute log, the letter-tile count, the streak with its frozen days and
the freeze button, and the loot count with a switch between a box after every mission and after
every second one (for when he starts asking what he gets before he begins). "איפוס המשימה של
היום" now also takes back the loot found today.

## Automatic backup to a Google Sheet (optional, v3.3.0)

Each change to the save is also sent to one Google Sheet of yours, about 15 seconds after the
last change, and again when the app goes to the background. It is one-way: the game never reads
anything back. If the iPad is offline, it sends when the network is back. The manual export still
works as before.

The script lives inside that one Sheet and is marked `@OnlyCurrentDoc`, so Google asks only for
access to **the spreadsheet it is installed in**. It gets no access to your Drive or your other
files.

**One-time setup, about 5 minutes, on a computer:**

1. In Google Sheets, create a blank spreadsheet and name it `Hey1 backup`.
2. **Extensions → Apps Script**. Delete what is in `Code.gs`, paste all of
   [`backup/apps-script.gs`](backup/apps-script.gs), and save (⌘S).
3. **Deploy → New deployment** → the gear icon → **Web app**. Set *Execute as*: **Me**, and
   *Who has access*: **Anyone**. **Deploy**.
4. Authorize: choose the account → *Advanced* → *Go to … (unsafe)* → **Allow**. The "unsafe"
   warning appears for every script you write yourself. The permission listed should be "View and
   manage spreadsheets that this application has been installed in". If it asks for all of Drive,
   the `@OnlyCurrentDoc` line was not pasted.
5. Copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`). Opening it in a
   browser should show `{"ok":true}`.
6. On the iPad: coach screen → **גיבוי אוטומטי לגיליון Google** → paste the URL → **שמור**. It
   sends a first copy right away and should say "הגיבוי עובד".

**What's in the Sheet:**
- **`backups` tab:** one row per game day, holding the day, when it was saved, the number of
  sessions and the size. The save itself follows, split over several cells because a cell holds
  at most 50,000 characters.
- **`older` tab:** a copy with fewer sessions than the newest one, such as a fresh empty game,
  never overwrites a row. It goes here instead.

**To restore:** reopen the Sheet; a **Hey1** menu appears. Click a row, then choose **Hey1 →
Show save of the selected row** → **Copy**. In the coach screen tap **⬆️ ייבוא שמירה**, paste,
then tap **ייבא**. The first use of the menu asks for one more permission, to show a dialog.
The backup URL survives an import.

**Privacy:** the URL is the only key. It is kept in the game's save on the iPad and is never in
this repo. Anyone with the URL could add rows to that Sheet, but nobody can read anything through
it. To revoke it, go to Apps Script → Deploy → Manage deployments → archive. Then create a new one
and paste the new URL. "איפוס מלא" also clears the URL.

**Status:** the coach screen shows the last successful backup and, if the last try failed, why.

The game also asks the browser to keep its storage (`navigator.storage.persist()`), so that
Safari does not clear it after a week without visits.

## Reset the game for a fresh day-0 (e.g. after testing on the Mac)

Coach screen → "איפוס מלא" (full reset). Or in the browser console: `localStorage.clear()`.
