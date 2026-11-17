# Hey! Unit 1 game: project notes for Claude

A game for one child (Gilad) to prepare for an English test on 22 Nov 2026 (Hey! Unit 1, ECB). Static PWA: vanilla JS, no build step, no backend. State is in `localStorage`. The UI copy is Hebrew.

## Read first
- `prd.md` is v4 and the source of truth. Build from it. `archive/prd-v3.md` is history only.
- Before any design or study-plan work, read `actionable-gamification-reference.md` (Octalysis) and `leitner-system-reference.md` (Leitner). Do not re-derive the frameworks.
- `README.md` covers how to run and deploy.

## Rules that matter
- **Kid-facing copy never mentions his level or any weakness.** That covers app strings and scripts a parent reads aloud. Nothing about getting stuck, being slow, improving, or "soon you'll be able to". Even a before/after frame judges the "before". The posture is that the words are the ones to conquer: they are nervous or hiding, and he is coming for them. Humor targets the words, never him.
- **Visuals come from the chosen skin (prd.md §9).** Avoid the generic look of cream cards and pill buttons.
- **Nothing is cut.** The owner declined every proposed feature cut from v3. Do not re-propose cutting game features. Order each milestone test-facing first; days 6 and 8–10 may split into two sittings.
- **The test format is the 9 Nov practice copy** (see prd.md §4.4, including "Checked against the scan": the exact tasks, and five gaps between the test and what the game trains). It has 100 points: Listening 20, Vocabulary 20, Grammar 20, Reading 30, Writing 10. It has writing and listening, and passages longer than 5 sentences. It is not confirmed that the real test on 22 Nov uses this format, nor whether he heard the recording on the practice copy. Ask if still unknown.
- **No copyrighted audio or publisher material in the repo.** That covers the scan of the practice copy and its sentences: describe its shape, never quote it. The listening recordings are transcribed by the owner and streamed, never copied into the repo.
- **Deployment is manual and last.** The owner publishes from a personal account (GitHub Pages, `main`, root). Work on branches and open PRs. Do not merge or publish on your own.

## Running and testing
- Preview: `python3 -m http.server 8765 --bind 127.0.0.1`, then open `http://localhost:8765/`. Use a venv if you need any other Python.
- **Stale-cache trap:** `index.html` stamps `content.js`, `app.js` and `styles.css` with `?v=`. After an edit, bump the stamp or the browser may serve old files. Symptom: new code with old copy, such as unfilled `{placeholders}`.
- `test.html` (local addresses only, not published) seeds sample saves. Day 3 is M1-shaped, days 4 and 7 are M2 saves, day 6 is the mid-boss day, day 8 a recording day after it, day 11 the paper day (test mode opens in the parent session; writing is at rung 5), and day 12 the final boss (the mock inside the game). Use them to check behavior from an existing save.
- To simulate the next day, rewrite every `YYYY-MM-DD` in the localStorage JSON one day back and reload. To test a date rule (land 8 shuts after 18 Nov), fix the browser's clock before loading `test.html`.
- Sessions can be driven from the page via `window.__game`: `state`, `session`, `view`, `startSession`, `streak`, `settleStreak`, `grantLoot`, `buildReviewQueue`. Patch `__game.Audio.speak` and `afterSpeech` to skip speech waits. The level-1 story keeps "לשאלות" disabled until the read-aloud ends, so tap a word first.
- More handles on `window.__game`: `planFor(mode)`, `isLongDay(plan)`, `phase2()`, `settleHalves()`, `startWriting()`, `startStory()`, `startListening()`, `nextCard()`. To play one listening item, set `session.plan.listening = CONTENT.listening.items.find(...)` and call `startListening()`. To play one set, put `{ set: 'halves', sec: 'R' }` in `session.queue` and call `nextCard()`. To play one story, start a session, set `session.plan.story = { p: CONTENT.stories.find(...) }` and `state.story.level`, then call `startStory()`. To fix the writing sentences, fill `state.writing.again` with specs (`{ frame: 'have1', who: ['Omer'], x: 'flowers' }`) before `startWriting()`. A set (word bank, sentence halves) and a mid-boss sentence are queue items without a `cid`; read `session.current.view`.
- Test mode (a sitting on paper) opens by itself from `testModeFrom` in `content.js`, once. To open it on any day, set `state.settings.testDay` to today's date (`'off'` shuts it) and start a parent session, or call `__game.startTest()`. Its sheets are in `session.test.sheets`; `__game.testDue(mode)` and `__game.makeScene()` (the five-sentence picture) are exposed too. To see rung 5 in an ordinary quest, load the day-11 save and set `testDay` to `'off'`.
- The final boss opens from `finalBossFrom`, once: set `state.settings.finalDay` to today's date (`'off'` shuts it) or call `__game.startTest(true)`. It uses the same `session.test` as test mode, with `boss: true`: every sheet first (`stage: 'work'`), then every key. To see the "about me" card inside a quest, load the day-12 save, set `finalDay` and `testDay` to `'off'`, start a parent session and call `startWriting()`; `__game.startAbout(false)` opens a saved card. The speed round is `__game.startSpeed()` (state in `__game.speed`); set `speed.endsAt` to end a run early.
- `mock.html` is the printable mock (`?view=test`, `key` or `coach`); its content is `mock` in `content.js`. Keep that content out of `stories` and `listening`, or the game shows it before the mock. `window.__mock` has `play`, `Say`, `setView` and the point totals; stub `speechSynthesis` to test the player.
- ECB's audio host is usually not reachable from a cloud sandbox. Stub `**/*.mp3` with a short WAV to test the recording player, and abort the route to test the fallback dialogue.
- Screenshots can lag one frame behind a script that just changed the screen. Wait, or take a second one.
- Progress is tied to the page's origin. A new address means a fresh save.
