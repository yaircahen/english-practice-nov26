# PRD — Two-Week English Test Game (Hey! Unit 1)

Status: v3, 7 Nov 2026, all design questions decided; ready to build M1. Author: Yair + Claude.
Companion files: `leitner-system-reference.md`, `actionable-gamification-reference.md`.

---

## 1. Summary

A 13-day, ~12-minutes-a-day game that gets a 5th grader (10 y/o, Hebrew L1, below-grade English
reading fluency) to ace a vocabulary + grammar test on **Sunday 22 Nov 2026**, covering Unit 1
("Friends") of ECB's *Hey!* coursebook.

The engine is a **Leitner box system** (spaced repetition with active recall). The wrapper is an
**Octalysis-designed game**: a map of territories to conquer, a mystery box after every session, a
boss fight that *is* the mock test, and a parent in the role of coach. Reading fluency is treated as
a first-class target, not a side effect: every card has audio, there are dedicated decoding drills,
and the daily loop ends with reading aloud to the parent. A third track, **paragraph reading and
comprehension**, adds one short "friend" story a day, read under a scaffolding ladder that fades
over the two weeks, with meaning questions that give hints instead of failing him.

Delivered as a single-file web app (runs offline on iPad/phone/laptop, Hebrew UI, no backend),
plus printable paper worksheets for the final days, because the real test is on paper.

---

## 2. Goals and success metrics

**Business metric (Octalysis box 1):** the test score.

| Metric | Target | When |
|---|---|---|
| Real test score | ≥ 90 | 22 Nov |
| Final mock test (paper, test format) | ≥ 90% | Day 12 (Fri 20 Nov) |
| Vocabulary cards in Box 4–5 ("mastered") | ≥ 90% of 50 words on Recognition, Sound-lineup and Word↔Image; ≥ 70% on tile Production | Day 11 |
| Grammar cards in Box 4–5 | ≥ 85% | Day 11 |
| (Secondary) Reading check: reads all 50 words aloud correctly, ≤ 2 s each | 45/50 | Day 11 |
| Comprehension check: reads an **unseen** 4-sentence paragraph at scaffold level 3 (≤ 3 word taps) and answers 4 of 5 meaning questions with no hints | pass | Day 11 |
| Scaffold level reached on the story track | level 4 of 5 | Day 10 |
| Sessions completed | ≥ 12 of 13 | ongoing |
| Session length (median) | 10–14 min | ongoing |
| Kid-reported "want to play tomorrow" (thumbs at end of session) | ≥ 70% 👍 | ongoing |

Anti-metrics (things we refuse to optimise): total minutes played, points, number of badges.

---

## 3. The learner

- 10 y/o boy, just started 5th grade, Hebrew-speaking home.
- **Reading fluency is below grade**: decoding English words is slow and effortful. This means:
  - He can "know" a word by ear and still fail it on paper.
  - Visually similar words (`pool / put / people`, `best / better / because / begin`) will be
    confused. The Unit 1 list has 10 words starting with *b* alone.
  - Timers on reading tasks will create anxiety and false failures. No countdowns on reading.
  - Text-heavy UI will be skipped. Instructions in Hebrew, English only where it's the content.
- Has already gone through the list once with the teacher/parent (handwritten Hebrew on the sheet).
  The 25 words marked "×" are the ones he **got wrong** on that pass. They go first.
- **Suspected (unassessed) reading difficulty.** The app uses dyslexia-friendly defaults
  throughout at no cost: wide letter spacing and line height, short lines, cream background, no
  italics or all-caps, tap counts hidden until scaffold level 4, and a slower fading pace on the
  story track (3 clean paragraphs to level up, not 2). See §9.1.
- Attention budget: ~12 minutes, once a day. Two sessions a day only in the last 3 days.
- Sessions are **mostly with a parent**, sometimes **alone in the afternoon**. Solo sessions are
  expected to be shallower (cementing, not advancing), and the app treats them that way (§7.4).
- Player type guess: Achiever/Explorer for a 10-year-old boy. Validate on day 1 by letting him
  choose the theme (§7.1).

---

## 4. Scope: the test material

From the teacher's sheet (test date 22/11/26):

1. Pronouns: I, we, you, they, he, she, it
2. To be: positive, negative, questions, short answers, Wh-questions
3. have / has
4. a / an / some
5. Vocabulary: HEY Chapter 1, 50 words

Added by the parent, beyond the teacher's list:

6. **Reading comprehension**: read a short paragraph (3–5 sentences) and answer questions about
   its meaning. Not confirmed to be on this test, but it is the skill the whole unit builds
   toward and the one he is weakest at. See §6.5.

### 4.1 Vocabulary (transcribed from the sheet, Hebrew as written by the kid, cleaned)

| # | English | Hebrew | × | # | English | Hebrew | × |
|---|---|---|---|---|---|---|---|
| 1 | age | גיל | | 26 | young | צעיר | |
| 2 | also | גם | × | 27 | best | הכי טוב | × |
| 3 | begin | להתחיל | | 28 | better | יותר טוב | |
| 4 | birthday | יום הולדת | | 29 | call | לקרוא | |
| 5 | different | שונה | | 30 | choose | לבחור | |
| 6 | hobby | תחביב | | 31 | information | מידע | |
| 7 | month | חודש | | 32 | more | יותר / עוד | × |
| 8 | pool | בריכה | | 33 | next | הבא | |
| 9 | same | אותו הדבר | | 34 | wait for | לחכות ל | × |
| 10 | year | שנה | | 35 | blanket | שמיכה | × |
| 11 | a lot of | הרבה | | 36 | brush | מברשת | × |
| 12 | chess | שחמט | | 37 | every | כל | × |
| 13 | first | ראשון | | 38 | give | לתת | |
| 14 | important | חשוב | × | 39 | put | לשים | × |
| 15 | learn | ללמוד | × | 40 | take care of | לטפל ב | × |
| 16 | old | זקן | × | 41 | time | זמן | × |
| 17 | people | אנשים | × | 42 | toy | צעצוע | |
| 18 | special | מיוחד | × | 43 | wash | לשטוף | × |
| 19 | together | ביחד | | 44 | with | עם | |
| 20 | win | לנצח | | 45 | always | תמיד | × |
| 21 | but | אבל | × | 46 | like | לאהוב | |
| 22 | fast | מהר | × | 47 | other | אחר | × |
| 23 | hard | קשה | × | 48 | team | קבוצה | × |
| 24 | help | לעזור | | 49 | because | בגלל ש | × |
| 25 | if | אם | × | 50 | break | לשבור | × |

Notes on the list:
- `old` is written as זקן; for a test it should also carry "ישן / בן (גיל)" since "How old are you?"
  is certainly on the test. `call` as לקרוא should carry "להתקשר / לקרוא ל" too. `like` should
  carry both "לאהוב" and "כמו". These get a second meaning line, not a second card (one fact per
  card, but the test may ask either).
- 14 words are verbs written in Hebrew infinitive (להתחיל, ללמוד, ...). Cards show the English
  bare form as on the sheet.
- Multi-word items (`a lot of`, `wait for`, `take care of`) are production-heavy; they get sentence
  cards from day one.

### 4.1b The starter kit (land 0, day 0): pronouns and question words as sight words

Decided 8 Nov. Pronouns and Wh-words are a tiny closed set that everything else stands on: every
"to be" sentence needs a pronoun, every story question from day 2 opens with What / Who / How
old, and noun→pronoun ("Dan and I → we") is almost certainly its own section on the test. So they
are taught **before land 1**, as ordinary Leitner cards (Recognition, Sound-lineup, Word↔Image),
not as a grammar tower.

| Pronouns (7) | Hebrew | Question words (6) | Hebrew |
|---|---|---|---|
| I | אני | What | מה |
| you | אתה / את | Where | איפה |
| he | הוא | Who | מי |
| she | היא | When | מתי |
| it | זה | Why | למה |
| we | אנחנו | How old | בן כמה |
| they | הם / הן | | |

- Introduced in the **day-0 parent session** (13 items, ~5 minutes). Land 1 stays on day 1.
- `what / where / when / who` are a look-alike cluster like the *b*-words; the Sound-lineup card
  drills them against each other.
- **Not counted in the 50.** The visible goal stays "50 words conquered"; the starter kit is its
  own stop at the start of the trail (the wand and robe before setting out).
- **Noun→pronoun card (M2):** "Dan → ?", "Dana and I → ?", "the toy → ?", "Dan and Dana → ?"
  with four pronoun choices. This is the test task itself.
- Consequences: grammar tower 1 shrinks to *to be* alone (am / is / are) on day 3, built on
  pronouns he already reads; tower 3 becomes Wh-question *building* (word order), not the words;
  story questions can be asked in English from scaffold level 2 instead of 3.

### 4.2 Grammar, decomposed into card-sized facts

| Topic | Facts to drill | Example card prompts |
|---|---|---|
| Pronouns | 7 pronouns ↔ Hebrew; noun → pronoun (Dan → he, Dan and I → we, the toy → it, Dana and Dan → they) | "דן ואני = ___" |
| To be, positive | am / is / are by subject | "She ___ ten." |
| To be, negative | 'm not / isn't / aren't (and long forms) | "They ___ (not) in the pool." |
| To be, yes/no questions | Is / Are + subject | "___ you in a team?" |
| Short answers | Yes, I am. / No, he isn't. (never "Yes, I'm.") | "Is she young? → Yes, ___ ___." |
| Wh-questions | What / Where / Who / When / How old + is/are | "___ old is he?" and matching Q→A |
| have / has | have (I, you, we, they) vs has (he, she, it) | "My team ___ a special blanket." |
| a / an / some | a + consonant sound, an + vowel sound, some + plural / uncountable | "___ hobby", "___ age", "___ information", "___ toys" |

Grammar sentences are built **only from Unit 1 vocabulary** so every grammar card is also a
vocabulary rep and a reading rep.

### 4.3 Reading material

ECB's site gives free MP3 audio for every Unit 1 text (pages 18–45) at
https://www.ecb.co.il/hey-3/ (and https://www.ecb.co.il/downloads/hey/hey-listenings/). These are
the actual book texts the kid has in his bag. Use them for the "read-along" minute (§6.3): kid
follows the printed book while the MP3 plays, then reads one paragraph back.

For the story track (§6.5) the app ships its own **12 graded paragraphs**, written only from Unit 1
vocabulary and grammar, on the unit's theme (friends: name, age, birthday, hobby, team, what they
have, what they like). The book is not at home, so the real texts are not in v1; if a classmate's
book or the school can supply pages 18–45 later, 3–4 of them become the hardest tier.

---

## 5. Constraints and assumptions

Decisions (from Yair, 7 Nov):

1. **Test format**: EN→HE translation, word-to-image matching, grammar fill-in, short answers,
   and a reading passage with questions. **No writing English from Hebrew** expected, so
   spelling is secondary: production cards use letter tiles only, never free typing, and carry
   less weight in the "mastered" metric. The test is on paper.
2. **Device**: iPad, Safari. No installs, no accounts.
3. **Time**: mostly evening with a parent; some solo afternoon sessions. Solo sessions end with a
   4-digit completion code shown only after the full loop, and the coach log records per-step
   timings and accuracy (§7.4).
4. **Start date**: Sunday 8 Nov if the build lands tomorrow, otherwise Monday 9 Nov. The schedule
   below assumes 13 sessions (Mon 9 → Sat 21) with Sunday 8 as a bonus onboarding day.
5. **Parent as coach only**: no parent player profile. The parent spends ~3 min/day listening to
   him read and ~1 min on the coach screen.
6. **Theme**: he picks one of three skins on day 0 and names his hero.
7. **No book at home**: read-along days use app paragraphs; ECB's MP3s are not used in v1.
8. **Rewards**: the in-game feedback loop is the reward (§7.6). The mystery box gives in-game
   cosmetic loot only. Real-world rewards are limited to at most one boss prize he names on day 0
   and Yair approves. No screen time, food, or money as currency.

Hard constraints:
- No internet dependency during a session (TTS must be the device's built-in voice).
- Hebrew RTL UI; English content LTR; font size ≥ 20px for English words.
- No ads, no accounts, no data leaving the device except a manual JSON export for backup.

---

## 6. Learning design

### 6.1 Leitner engine

- **5 boxes, session-based** (not calendar-based), so a skipped day doesn't break the schedule.
  Box 1 is reviewed every session, Box 2 every 2nd session, Box 3 every 4th, Box 4 every 7th,
  Box 5 = "mastered": only spot-checked inside boss fights and on the final two days.
  With 13 sessions, a card seeded by session 5 can reach Box 5 by session 12. Matches the
  reference's rule (last interval ≤ D/2).
- **Promotion**: correct → up one box. **Demotion**: wrong → down one box (the gentle variant).
  The classic "back to Box 1" is too punishing for a 10-year-old and over-reviews mature cards;
  the reference's weakness note applies.
- **Strict marking**: a tile-built word must be exact; "almost" is a miss (reference §6). The UI
  shows which tile is wrong so the miss teaches.
- **Review order within a session**: highest due box first, then down to Box 1; failed cards
  re-appear at the end of the same session (second chance, no box change on the retry).
- **Leech rule**: 4 misses on a card → it becomes a "tricky word" (🔥 marker). It gets a picture /
  emoji cue and a Hebrew mnemonic line, and goes to the parent's coach screen for a 30-second
  human explanation. Tricky words are the final-week focus.
- **Daily cap**: ≤ 12 new vocabulary cards per session, ≤ 8 new grammar cards. Box 1 should never
  exceed ~25 cards. If it does, the app pauses new content for that session automatically.
- **One promotion per card per day, inside the session only.** Extra practice in the training
  grounds (§7.7) never moves a card, so a box number always means "recalled after a gap".
- **Last 3 days (days 11–13)**: no new cards; every box reviewed once; Box 1–2 twice a day;
  paper mode (§6.4).

### 6.2 Card types

Cards are generated from a data file (one entry per word / grammar fact), so the count below is
derived, not hand-written.

| Card type | Prompt → Answer | Trains | Introduced |
|---|---|---|---|
| **Recognition** (EN→HE) | See + hear English word → pick Hebrew from 4 | meaning, first exposure | day a word is unlocked |
| **Sound lineup** (listen→read) | Hear the word → pick it from 4 visually similar English words | decoding, letter-sound mapping | same day |
| **Word↔Image** | See the English word → pick the emoji/picture from 4; and the reverse | the test's matching task; meaning without Hebrew | same day (only for the ~30 picturable words) |
| **Production, light** (HE→EN) | See Hebrew → build the English word from letter tiles (no free typing) | spelling as a reading aid, secondary | when Recognition reaches Box 3 |
| **Sentence cloze** | Sentence with the target blanked, audio of full sentence available → pick the word from 4 | word in context, reading | when Recognition reaches Box 2 |
| **Grammar cloze** | Sentence with blank → pick am/is/are, have/has, a/an/some from choices | grammar, as the test asks it | per grammar level |
| **Sentence builder** | Hebrew sentence → arrange English word tiles in order | word order, questions, short answers | grammar levels 2–3 |
| **Q↔A match** | Wh-question → pick the matching answer (and reverse) | Wh-questions | grammar level 3 |
| **Story** (not a Leitner card) | 3–5 sentence paragraph + 4–5 questions under the scaffold ladder, §6.5 | comprehension, fluency, grammar in context | one per day from day 2 |

Derived counts: 50 words × 3 core types + ~30 Word↔Image + 50 light Production ≈ 230 vocab
cards, plus ~60 grammar cards. Not all exist on day 1: Production and Cloze cards are born from
promotions, which is itself a visible unlock (CD2/CD6).

Land order follows the sheet: the 25 "×" words (the ones he got wrong) fill lands 1, 2 and half
of 3; the known words come last and are expected to jump to Box 2 on their placement round,
which makes days 4–5 lighter just as grammar towers 2–3 arrive.

Distractor rules for multiple choice: distractors come from the same unit, matched on first letter
or length when possible (`best/better/because/begin`), so the choice itself trains decoding.
Never show a distractor that is a correct answer for another meaning.

### 6.3 Reading-fluency track (runs in parallel to Leitner)

Why: a Leitner deck with audio makes a kid who can *hear* and *translate*; the test needs a kid
who can *read* a word on paper and know what it means, and read a passage. These are the
counter-measures.

1. **Audio on every card** (device TTS, en-US, slowed to 0.85×). Week 1: autoplays. Week 2:
   behind a 🔊 button (fading scaffold). The app logs how often he taps it; dropping tap rate is a
   fluency metric.
2. **Chunked display** on first exposure and on tricky words: `in·for·ma·tion`, `birth·day`,
   `to·ge·ther`, `im·por·tant`, `dif·fe·rent`. Tapping a chunk says it.
3. **Sound lineup cards** (above): the only card type that forces discrimination between
   look-alikes. Dedicated lineup sets for the *b*-cluster, the *w*-words (win/wash/with/wait),
   and the vowel pairs (`pool/choose/too`, `team/learn/year`, `same/age/take`).
4. **Phonics tips in Hebrew**, one line, attached to words that need them: silent *e*
   (`same, time, age, take, choose`), *ea/ee* (`team, year, learn` — and that `learn` cheats),
   *th* (`together, with, they, the`), *wh* (`what, where, when, who`).
5. **Reading minute** (parent sessions only, secondary): the app shows 3 sentences (unit words +
   unit grammar) in large type; he reads them aloud; parent taps ✓ / ✗ per sentence. ✗ sentences
   come back next time. This is the only human-graded signal in the system; it feeds the coach
   log, not the game. Reading aloud is not what the test asks, so it never gates progress and is
   the first thing dropped if a session runs long.
6. **Read-along** (days 2, 5, 8, 11; replaces the reading minute): the app plays a tier-A/B
   paragraph with karaoke highlighting while he follows, then he reads it back to the parent.
   (The book is not at home, so ECB's MP3s are not used in v1.)
7. **No timers on reading**. The only timed mode is the optional "speed round" on Recognition
   cards of Box 4–5 words, which he chooses to enter (CD3, not CD8).

### 6.4 Paper mode (days 11–13): decided, option B + one printed mock

**The problem it solves.** The real test is on paper: a printed word in the teacher's font, no
audio, no tap-to-hear, no four highlighted choices, handwritten Hebrew answers, a passage with
questions below it. Everything in the app is tappable and spoken. Kids who practise only on
screens often freeze on paper, and for a kid with a decoding weakness the gap is bigger: reading
a word cold, with no 🔊 fallback, is the actual skill under test. Some paper-like practice before
day 22 is not optional; the question is how much and in what form.

**Options**

| Option | What it is | For | Against |
|---|---|---|---|
| A. Printed A4 worksheets (original draft) | App generates sheets + answer key; he writes with a pen; parent marks; misses typed back into the app | Closest to the real thing: layout, font, pen, no feedback until the end; the mock gives the honest number | Needs a printer at home; feedback is delayed and comes from the parent, who becomes the judge; no in-session dopamine on the days when the streak matters most; worksheet generator + key is real build cost; results re-entered by hand |
| B. "Test mode" on the iPad + plain paper | A screen that looks like a worksheet: white, black, plain font, no audio, no choices, no hints; he writes answers on any sheet of paper; when done, the app shows the key and he marks his own sheet with the parent beside him, tapping ✓/✗ into the app | No printer; immediate (end-of-sheet) feedback; he marks himself against the key, so the parent is a witness, not a judge; results land in the app directly; cheap to build; keeps the boss-arena celebration at the end | Still a screen: the eye-to-paper transfer is not fully tested; the parent can't see his face while he reads the way they can with paper |
| C. Parent-handwritten sheet | App shows the parent a list of 10 items; parent writes them on paper; kid answers; app shows key | Zero build; real paper | Parent effort each time; handwriting is not the teacher's font; only works in parent sessions |
| D. No paper | Test mode on the iPad only | Simplest | Accepts the medium gap entirely; the mock number is optimistic |

**Decision (7 Nov): B for days 11–13, plus one printed full mock on day 12 (A)** if a printer
is reachable (home, work, a neighbour). If no printer, the day-12 mock runs as B with the parent
writing the comprehension passage out by hand (C), since that is the one part where "reading
cold from paper" matters most. Marking is always "we check together against the key", never the
parent grading alone. The misses, however entered, demote the cards.

What this means for the build (M4): a **test-mode screen** (worksheet look, no audio/choices/
hints, sequential items, "done" reveals the key with ✓/✗ taps per item) and a **single printable
mock** (one A4 PDF-ready page + answer key), not a general worksheet generator.

### 6.5 Paragraph reading and comprehension track ("stories")

**Why a separate track.** Flashcards train words; comprehension needs him to hold 3–5 sentences in
his head while decoding is still slow. The two failure modes are opposite: he either gives up at
the first unknown word, or he "reads" the whole thing and retains nothing. The design answers both:
support that fades, and questions that come with hints rather than a fail.

**Corpus.** 12 app-written paragraphs, each one "friend" (Unit 1 is *Friends*): name, age,
birthday month, hobby, team, what they have, what they like, one "but/because" sentence. Every
sentence uses only Unit 1 words plus a closed list of ~30 function/sight words (`this, is, my,
his, her, name, ten, and, in, at, the, very, not, ...`) that get the same audio + Hebrew tap as unit
words. Graded in three tiers:

| Tier | Sentences | Shape | Days |
|---|---|---|---|
| A | 3 | one idea per sentence, present "to be" only, no pronoun shifts | 2–5 |
| B | 4 | has/have, `a/an/some`, one `because` or `but` | 6–9 |
| C | 5 | pronoun shifts (`Dan ... he ... they`), one Wh-question inside the text, one negative | 10–13 (+ book texts if available) |

**The scaffolding ladder (gradual release).** The whole track has a current *support level*. It
starts at 1 and moves up when he completes three paragraphs at the current level with ≤ 2
word-taps per sentence and ≥ 4/5 questions right without hints (three, not two, because of the
suspected reading difficulty). Levels 4 and 5 can only be reached in a parent session. It never
moves down in front of him; the coach can lower it silently.

| Level | Before reading | While reading | Questions |
|---|---|---|---|
| 1 Listen & follow | Emoji + title; 3 key words previewed with Hebrew; Hebrew one-line gist of the story | Audio autoplays, sentence by sentence, karaoke highlight; each sentence has a "מה זה אומר?" button showing its Hebrew | Hebrew question, Hebrew/emoji answers |
| 2 Read along | Same preview, no gist | Audio plays only when he taps a sentence; any word tap says it and shows Hebrew | Hebrew question, English answers (3 choices) |
| 3 Read with help | Key words only | No audio by default; word tap still works, tap count logged for the coach but not shown | English Wh-question, 3 English choices, plus "find it" (tap the sentence with the answer) |
| 4 Read alone | Title only | Word taps allowed but the paragraph is "won" only at ≤ 3 taps; 🔊 for whole paragraph after reading | English questions: Wh + true/false with short answers (`Yes, he is.`) + one typed 1–2 word answer |
| 5 Read to coach | Nothing | He reads aloud to the parent, who marks ✓/✗ per sentence (this replaces the reading minute on story days) | Same as 4, no "find it" |

**Repeated reading.** Each paragraph is met three times: first on its day at the current level,
again two days later one level higher, and a third time as a 20-second "warm read" at the start
of a later session. Re-reading a known text is the best-evidenced fluency technique and it lets
him feel the speed-up ("Day 4: 58 seconds. Day 6: 31 seconds."). Timing is measured silently and
shown only after, as a personal best, never as a countdown.

**Question design** (4–5 per paragraph, generated from the paragraph's structured data, so they
are always answerable from the text):

- *Fact*: "How old is Dan?" / "What is her hobby?" (maps to the Wh-question grammar topic)
- *Yes/no with short answer*: "Is Dan in a team? → Yes, he is / No, he isn't" (maps to short
  answers)
- *Pronoun resolution*: "Who is 'she'?" at tier C
- *Why/but*: "Why is the toy special?" at tier B+ (`because` sentence)
- *Hebrew meaning check*: "מה דן אוהב?" with Hebrew choices, levels 1–2 only

**Hint ladder per question** (instead of wrong = fail):
1. Highlight the sentence that holds the answer.
2. Show that sentence's Hebrew.
3. Show the answer, then ask the same question again in the next session.

A question answered with no hints earns a ⭐; with hints, a ☆; stars are per paragraph (max 5).
Hints are free and unlimited; they cost stars, not progress. Using hint 3 on the same fact twice
flags it to the coach.

**Comprehension strategies taught as one-line Hebrew tips** (shown once each, then on demand):
read the question before the text; find the question's key word in the text; the answer is in the
sentence with that word; "he/she/they" points back to the last name mentioned; `because` answers
"why". These are test-taking moves he can use on an unseen passage.

**Game hook.** Each paragraph is a friend. Finishing it (any star count) adds that friend's
**card** to his collection (name, age, hobby, emoji); 5 stars gilds the card. 12 friend cards is a
Collection Set (CD4/CD6). On day 9 he writes his own friend card as a paragraph about himself
using a fill-in template ("My name is ___. I am ___. I have ___. My hobby is ___. I like ___
because ___."), parent types, app reads it back. That paragraph becomes paragraph 13, the one he
reads to the grandparents (CD1/CD5).

---

## 7. Game design (Octalysis)

### 7.1 Narrative and theme (CD1, CD4)

The kid picks one of three skins on day 1 and names his hero. Mechanics are identical; only art
and labels change. Candidate skins (pick based on what he's into; see open question 4):

- **Conquer the map**: 9 territories (5 word lands, 4 grammar towers). Each territory has 10 words
  or one grammar topic. Mastered cards raise your flag.
- **Space mission**: 9 planets; mastered cards are fuel; the final boss is the landing.
- **Wizard's apprentice** (fantasy): 9 realms; each word is a spell you learn, Box 1 to Box 5
  is "scroll → apprentice → adept → master → grimoire"; tricky words are cursed spells that need
  the coach's help to lift; the final boss is a dragon guarding the test; loot is hats, staffs,
  robes and familiars. This skin fits the cosmetic-loot system best.

Frame for the parent to say on day 0 (Epic Meaning, honest version): "There are 50 words and a
boss at the end. The test is just the boss fight." **Rule for all kid-facing copy: never
describe his current level or weakness, not even as a "before".** The words are the ones with
the problem (they are unconquered, nervous, hiding); he is the one who is coming for them.

### 7.2 Desired actions and win-states

| Phase | Desired action | Win-state (felt within seconds) |
|---|---|---|
| Onboarding (day 1) | Pick theme, name hero, play 10 easy Recognition cards | First territory "discovered"; 5+ cards already jump to Box 2 (Beginner's Luck, honest: he already knows them) |
| Scaffolding (days 2–10) | Open the app at the fixed time; finish the due stack; read 3 sentences aloud | Stack empties with an animation; map updates; mystery box opens |
| Scaffolding | Get a word to Box 5 | "Mastered" stamp + it moves to the Trophy Shelf |
| Scaffolding | Beat a tricky word | 🔥 extinguishes; parent gets a notification line |
| Endgame (days 11–13) | Paper worksheets; mock test | Boss defeated; "ready" badge the parent co-signs |

### 7.3 Core-drive mapping

| Drive | Mechanic in this game | Guardrail |
|---|---|---|
| CD1 Epic Meaning | Narrative skin; the honest frame about reading, not grades | Don't overstate; kids smell it |
| CD2 Accomplishment | Box ladder shown per word; map territories; progress bar "words mastered 31/50"; boss fights | Progress only from real recall; no badge for logging in |
| CD3 Creativity | Letter-tile building; he writes his *own* example sentence for each tricky word (parent types it; becomes a card); choosing which territory to attack next (when ≥2 are unlocked) | Keep choices real, not Poison-Picker |
| CD4 Ownership | Hero name + avatar; Trophy Shelf of mastered words; his own sentence cards; the 12-friend card collection, gilded at 5 stars; his own "about me" paragraph; export file is "his save" | — |
| CD5 Social | Parent-as-coach screen; the reading minute; end-of-session **brag card** (screenshot-ready image: "Day 6: 23 words mastered, 4-day streak") to send to grandparents / the other parent | Never compare to classmates |
| CD6 Scarcity | One quest a day with a fixed length (Magnetic Cap: advancement stops when the stack is done, "come back tomorrow"); territories unlock one per day; boss fight unlocks only at 80% Box ≥3; the training grounds stay open for optional play that advances nothing (§7.7) | Cap stops him from binge-and-burnout and protects spacing; free play keeps the cap from feeling like a wall |
| CD7 Unpredictability | Shuffled stacks; **mystery box** of cosmetic loot with rarity tiers after every completed session (§7.6); occasional "golden card" with a bigger celebration | Loot never affects learning or progress; never gate learning behind it |
| CD8 Loss & Avoidance | Streak with **one free freeze per week**; a demotion animates the card sliding down one box (felt, not punitive); the coach can see "cards that fell today" | No hearts/lives; no streak ends on a sick day; demotion is one box, never to Box 1 |

Black-hat (CD6/7/8) is used only to trigger the daily session. The session itself must be
white-hat: visible competence (CD2), choices (CD3), and the parent's attention (CD5). If he ever
asks "what do I get" before starting, the reward mix has drifted too extrinsic; cut the mystery box
to every other day.

### 7.4 Session loop (target 14 min)

1. **Open** (30 s): map, streak, "today's mission: 18 cards + 1 new land + 1 friend".
2. **Warm read** (20 s, from day 4): re-read a paragraph from two days ago; personal-best time.
3. **Review** (5–6 min): due boxes, high to low; failed cards return at the end.
4. **New land** (days 1–5 only, 3 min): meet 10 new words: see, hear, chunked, emoji; then
   immediate Recognition + Sound-lineup round.
5. **Story** (4 min, from day 2): one paragraph at the current scaffold level + its questions.
   On level-5 days and read-along days the parent sits in for this step.
6. **Reading minute** (1–2 min, parent sessions only, secondary): 3 sentences aloud, parent
   marks. Skipped when step 5 already had him read aloud to the parent, and the first step cut
   when time runs short.
7. **Close** (1 min): map update, friend card, mystery box, 👍/👎 "play again tomorrow?", brag card.
8. **Training grounds** (optional, his call, parent-capped): free play that builds skill but
   moves nothing on the quest (§7.7).

Days 1–5 run long (~15 min) because new lands and stories overlap; days 6–10 drop the new land
and come back to ~13. Hard stop at 16 minutes: the app ends the session gracefully even if cards
remain ("the rest wait for tomorrow"), to protect the appointment dynamic and the kid's tolerance.
The story is never the thing that gets cut; the review stack is.

**Solo vs. coach sessions.** The session starts with one tap: "מי איתך?" (alone / with a parent).

| | Solo (afternoon) | With parent (evening) |
|---|---|---|
| Review stack | yes | yes |
| New land | no | yes |
| Story | current level, max level 3 | any level; levels 4–5 only here |
| Reading minute | no | yes |
| Level-ups, boss fights | no | yes |
| Ends with | a **4-digit completion code**, shown only after the full loop; parent checks it in the evening | map update, brag card |

Solo sessions are deliberately shallow: they cement what the last parent session opened. The
coach log records per step: cards seen, accuracy, seconds, taps, hints, and whether the session
was ended by the hard stop or completed. A solo session that completes in under 4 minutes with
near-perfect accuracy is flagged as "too fast" for the parent to glance at. The code is derived
from the session number and the date, so it cannot be reused or guessed from yesterday's.

### 7.5 Reward design (Chou's six reward types)

**Decided 7 Nov: in-game loot (§7.6), plus at most one boss prize.** The options that were
weighed, kept for the record:

| Option | What it looks like | For | Against |
|---|---|---|---|
| A. Non-material only | Mystery box of jokes, "dad does your chore" cards, choose the family game, a chess match with a parent (chess is on the word list), a voice note from grandma | No overjustification risk; nothing to escalate; motivation stays on competence and parent attention, which is what carries week 2 | Weaker pull on days 2–4 when novelty fades; leans on the game feeling good and the parent showing up |
| B. Experiential perks | Extra screen time, choose dinner or dessert | Cheap, kid-valued, strong daily pull | Screen time as a prize frames the iPad game as the chore and the "real" screen as the reward; dessert ties food to performance; both tend to escalate ("only 15 minutes?") |
| C. One milestone prize | Nothing daily; one agreed prize he chooses for beating the final boss (a ≥ 90 mock) | Cleanest Earned Lunch: a real prize for a real accomplishment; no daily bribe; easy to explain | Two weeks is long for a 10-year-old to hold one goal; still needs a daily mystery box of tiny things for the appointment hook |
| D. Material daily | Card packs, stickers, small toys from the mystery box | Strongest short-term pull | Textbook overjustification: the activity becomes work the moment the prizes stop; "what do I get?" before every session; cost |

Decision: **the in-game loop is the reward** (§7.6). The mystery box gives in-game cosmetic
loot, not real-world items. Territory prizes are in-game (a rare loot drop guaranteed on each
territory clear). At most one real-world boss prize he names on day 0 and Yair approves. No
screen time as currency, because the game lives on the iPad. The boss-prize conversation happens
**with him on day 0** (CD4: he helped set it).

| Type | Use here |
|---|---|
| Fixed-action (Earned Lunch) | Each territory cleared = a guaranteed rare loot drop, visible on the map before it's earned (Dangling). The boss = his one real-world prize, agreed day 0. |
| Random (Mystery Box) | After every completed session (solo included): in-game cosmetic loot with rarity tiers (§7.6). A parent-authored pool of real-world items is an optional add-on, off by default. |
| Sudden (Easter Egg) | Hidden: say all 10 *b*-words right in one session → secret animation. Don't announce. |
| Social Treasure | A voice note from a grandparent unlocked by the coach when he beats a tricky word. |
| Prize Pacing | The map itself: one territory per day. |

Overjustification guard: no reward for merely opening the app; rewards attach to mastery and
completion, not to minutes.

### 7.6 Feedback mechanics (the loop is the reward)

**No self-assessment anywhere.** Classic Leitner asks "did you know it?" and trusts the answer.
A 10-year-old who wants the session over will say yes. Every card here is an interaction the app
grades itself: pick one of four, pick the word you heard, match the picture, build from tiles,
arrange tiles, tap the sentence with the answer. The only human-graded moment is reading aloud
to the parent, and that mark goes to the coach log, never to the game (he is never scored by a
parent in front of the game). This also happens to mirror the test, which is all recognition,
matching and fill-in.

**Design principle.** The in-session feedback loop is the primary reward. Real-world prizes are
at most a bridge for days 2–4. Three rules keep the dopamine honest:

1. **Reward the retrieval, not the tap.** Every satisfying moment is attached to a correct recall
   or a completed hard thing, never to time spent or screens visited.
2. **Difficulty is the drug.** The engine composes each session to land around 80–85% correct:
   enough wins to feel strong, enough misses to make the wins mean something. If accuracy runs
   above 92% for two sessions, the mix shifts toward harder card types; below 70%, toward easier
   ones and a shorter stack. This is both the most motivating zone and the best learning zone
   (desirable difficulty).
3. **Misses are information, never shame.** No red X, no "wrong!", no life lost. The right answer
   lights up, is spoken, shows its Hebrew, and the card comes back later in the same session for a
   second go. The sound is a soft "hm", not a buzzer.

**The feedback stack, fastest to slowest:**

| Within | Event | What he sees / hears |
|---|---|---|
| 100 ms | Correct answer | Tile pulses green, a rising "ding" whose pitch climbs with the combo, the word spoken aloud (double encoding), combo counter ticks up |
| 100 ms | Miss | Soft "hm", correct answer glows and is spoken, Hebrew shown, card slides to the back of the stack with "עוד פעם בקרוב" |
| 1 s | Card promoted | Card physically slides into the next box with a whoosh; box count ticks; Box 5 → confetti burst, "MASTERED" stamp, card flies to the trophy shelf |
| 1 s | Card demoted | Card slides down one box, brief, no sound effect beyond a soft thud; the box it left stays visible so the climb back is obvious |
| 3 s | Combo milestones | 5 in a row: screen flash + "x5"; 10: a short fanfare; combos count accuracy only, never speed (speed pressure wrecks reading) |
| ~10 s | Golden card | Roughly 1 in 15 cards is gold; getting it right triggers a bigger animation; no mechanical bonus (a double-promotion would corrupt the Leitner triage) |
| per section | Stack draining | A progress bar for the due stack that empties as he goes; the "empty stack" moment has its own fanfare |
| per story | Stars | Each question answered without hints lights a star in place, with a chime; 5/5 gilds the friend card on the spot |
| per session | Close | Numbers animate counting up (cards promoted, words mastered so far, streak), the map territory raises its flag, then the mystery box shakes and opens |
| per session | Personal bests | "Fastest stack", "longest combo", "fastest re-read" shown only when beaten |
| per day | Map | Territories visibly change state; the boss gate shows a percentage filling toward 80% |

**Mystery box contents: in-game loot, not real-world items (decided).** The box gives cosmetic
things he owns in the game: hats and outfits for the hero, map decorations, card backs and frames
for friend cards, alternative "ding" sounds, a new confetti colour, a sticker for the trophy shelf.
Rarity tiers (common / rare / golden) give the variable-reward kick. Nothing in the box affects
learning or progress, so it cannot be gamed and cannot corrupt the triage. This is how most
well-designed games for kids handle reward: ownership (CD4) and surprise (CD7) with zero
overjustification risk and zero cost. Real-world rewards then reduce to one boss prize of his
choosing, if any.

### 7.7 The daily quest is capped; the training grounds are not

**Rule.** All *advancement* (box promotions, new lands, story level-ups, map territories, loot,
streak) happens only inside the one scheduled session per day, which has a fixed length. When the
stack is done, the day's quest is done, and the map says so: "חזור מחר". Nothing he does
afterwards moves the quest.

**But he may keep playing.** Completing the session unlocks the **training grounds** for the rest
of the day: unlimited, optional, his choice of activity. It builds skill without touching the
schedule.

| | Daily quest (session) | Training grounds (free play) |
|---|---|---|
| When | Once a day, fixed length, hard stop | After the session, any time until the parent's cap |
| New words / lands | yes | no |
| Box promotions / demotions | yes | **neither**: cards never move from free play |
| Story level-ups | yes | no (any unlocked story can be re-read; re-reads feed the coach log) |
| Loot, streak, map | yes | no (a free-play "training" tally is shown, nothing more) |
| What's there | the due stack, today's land, today's story | Box 1–2 cards as drills, sound-lineup sets by look-alike group, word↔image memory game, re-read any friend, speed round on Box 4–5 words, test-mode practice in week 2, the wardrobe and trophy shelf |
| Feeds the engine? | fully | lightly: a card missed 3+ times in free play is placed first in tomorrow's stack; a card nailed in free play does not skip ahead |

**Why the cap.**
- **Spacing is the whole point of Leitner.** A card seen five times in one evening and promoted
  five times would sit in Box 5 without ever having been forgotten and recalled. The engine must
  only promote on a retrieval that happened *after a gap*. Free play has no gap.
- **Magnetic Cap (CD6).** Ending the quest while he still wants more is what makes tomorrow's
  session wanted. "You can't advance more today" is a feature, not a limit to apologise for.
- **Autonomy (CD3).** The quest is the parent's structure; the training grounds are his. He
  chooses the drill, the story, the speed round. Extra practice he chose is worth more than
  extra practice assigned, and it never feels like a longer homework.
- **Never punish extra practice.** No demotions, no streak risk, no "too fast" flags in free play.
  The worst that can happen there is nothing.

**Guardrails.**
- Free play is locked until the day's session is complete (it is the dessert, including on solo
  afternoons where the completion code is also what opens it).
- Parent-set free-play cap on the coach screen, default 15 min/day, enforced quietly ("the
  training grounds close for today"). This is the screen-time limit, in the app's own words.
- Free play never contains new words or stories he has not met in a session, so he cannot
  pre-learn tomorrow's land and make the quest trivial.
- The map home screen shows two things after the session: the quest marked done, and the
  training grounds door open. He should never be unsure whether "today counts" is finished.

**Feedback the parent gets** (coach screen, once a day): the three Leitner numbers (per-box
counts, promoted, demoted), tricky words, story level and taps per sentence, solo-session
completion code and the "too fast" flag. Not shown to the kid.

**Reading-aloud feedback (the gap).** Decoding is the one skill the app cannot grade. Three layers:
1. Sound-lineup and Word↔Image cards are auto-graded proxies: he must decode to pick.
2. Reading aloud to the parent is a performance for the coach log only; the parent taps ✓/✗ and
   says nothing mid-sentence. Keeps the parent out of the judge role.
3. Optional experiment, not v1: iPad Safari has speech recognition (Siri-backed, needs network).
   A "say the word" card with lenient matching could grade single words. Worth a 30-minute test
   on the real iPad before committing; kid accents and single-word utterances are where it fails.

---

## 8. Schedule (test Sunday 22 Nov)

| Day | Date | New content | Review | Story (new / re-read) | Reading | Game beat |
|---|---|---|---|---|---|---|
| 0 | Sun 8 | Install, pick skin, name hero, **starter kit: 7 pronouns + 6 question words** | — | — | — | Onboarding, the wand and robe |
| 1 | Mon 9 | Land 1 (words 1–10) | Box 1 | — | 3 sentences | Territory 1 |
| 2 | Tue 10 | Land 2 (11–20) | B1, B2 | A1 | Read-along (app) | Territory 2, friend 1 |
| 3 | Wed 11 | Land 3 (21–30) + Grammar 1 (pronouns, to be +) | B1, B2 | A2 | 3 sentences | Grammar tower 1 |
| 4 | Thu 12 | Land 4 (31–40) | B1, B2, B3 | A3 / A1 | 3 sentences | — |
| 5 | Fri 13 | Land 5 (41–50) + Grammar 2 (to be −, yes/no, short answers) | B1, B2 | A4 / A2 | Read-along | Grammar tower 2 |
| 6 | Sat 14 | Grammar 3 (Wh-questions) | B1, B2, B3 | B1 / A3 | 3 sentences | **Mid-boss** (mixed quiz, 20 cards) |
| 7 | Sun 15 | Grammar 4 (have/has, a/an/some) | B1, B2, B4 | B2 / A4 | 3 sentences | Grammar tower 4 |
| 8 | Mon 16 | — (tricky-word sentences he writes) | B1, B2, B3 | B3 / B1 | Read-along | Trophy shelf review |
| 9 | Tue 17 | His own "about me" paragraph | B1, B2 | B4 / B2 | story to parent | Friend card 13 |
| 10 | Wed 18 | — | B1, B2, B3, B4 | C1 / B3 | 3 sentences | Speed round unlock (optional) |
| 11 | Thu 19 | Test mode on iPad, answers on paper | all boxes | C2 / B4 | Read-along | Boss gate opens |
| 12 | Fri 20 | **Mock test (printed if possible, full, incl. unseen paragraph)** | B1–2 ×2 | C3 (unseen, level 4) | — | **Final boss** |
| 13 | Sat 21 | Misses only, 10 min, then stop | B1 | C4 / own paragraph to grandparents | 3 sentences | "Ready" badge, co-signed |
| — | Sun 22 | Test | — | — | — | Brag card to family |

Grammar is interleaved from day 3, not left for week 2, so grammar cards get their full Leitner
run. New words end on day 5; the last 8 days are retrieval only, which is where the score comes
from. Stories start on day 2 at scaffold level 1 and are expected to reach level 3 around day 6
and level 4 around day 10; if he moves faster, tier B starts earlier and the book texts fill the
end. The day-12 paragraph is deliberately unseen: that is the comprehension metric.

---

## 9. Product

### 9.1 Platform

- One HTML file (vanilla JS, no build step) in this folder, **published to GitHub Pages** from a
  repo with an unguessable name under Yair's personal account (the `gh` CLI on this Mac is
  logged into a work account and must not be used for this; deployment is a manual step by Yair,
  done last, after M1 is playable locally). Opened in Safari on the iPad, then **Add to Home
  Screen** so it runs full-screen as a web app with its own icon and the hero's name. Saves to `localStorage` with a one-tap JSON export ("save game")
  to iCloud for backup and for moving between devices.
  - Not via the Files app: tapping an .html in Files opens a Quick Look preview, which runs the
    page in a throwaway sandbox, so progress does not persist between opens. A local server on
    the Mac works only while the Mac is awake and on the same Wi-Fi, which rules out solo
    afternoons.
  - The URL must never change once he starts: `localStorage` is per-origin, so a new URL is a
    new, empty game. Each milestone is a redeploy to the same URL.
  - Progress lives on the iPad only. The coach screen is opened on the iPad, not on a parent's
    phone. The weekly "save game" export is the backup.
  - Needs Wi-Fi to load; after that a session runs without network. A service worker for true
    offline use is a v2 nicety, not needed at home.
- Primary target: **iPad Safari**, landscape and portrait, touch only (no keyboard needed:
  production cards are tiles, cloze is multiple choice).
- Audio: Web Speech API (`speechSynthesis`), en-US voice, rate 0.85. Tested on iOS Safari.
  Fallback: pre-recorded MP3s if the iPad has no decent voice.
- **Reading-friendly typography** (suspected reading difficulty): a wide, open sans font
  (Verdana / Arial on iOS, no download needed), English ≥ 24px, letter-spacing 0.05em, word
  spacing 0.2em, line-height 1.8, lines ≤ 50 characters, cream background (#FAF6EC) with dark
  grey text rather than black on white, no italics, no all-caps, one sentence per line at story
  levels 1–3. A coach toggle switches to a tighter standard layout if he prefers it.
- Speech recognition for "say it" cards is **out of v1** (unreliable on iOS Safari; the parent's ✓
  is the reading grader).
- Content lives in one `content.json`: words (en, he, second meaning, emoji, chunks, phonics tip,
  look-alike group, 2 example sentences), grammar facts, sentence templates, reward pool.

### 9.2 Screens

1. **Map / home**: territories, streak, today's mission, "play" button (Glowing Choice: the one
   obvious thing to tap).
2. **Session**: one card at a time, huge type, 🔊, 4 options or tile tray or text box, immediate
   feedback with the Hebrew meaning and the phonics tip on a miss.
3. **New land**: 10-word intro carousel.
4. **Reading minute**: 3 sentences, parent ✓/✗ buttons, "done" hands the device back.
4b. **Story**: paragraph in large type (≥ 24px, generous line height, one sentence per line at
   levels 1–3), sentence/word tap targets, karaoke highlight, "מה זה אומר?" per sentence at low
   levels, then the question panel with the 3-step hint button and star display. Level-5 mode
   shows ✓/✗ per sentence for the parent and hides all taps.
5. **Trophy shelf**: mastered words as cards he can flip; tricky words shown with 🔥; the friend
   card collection (12 + his own), gilded ones first.
6. **Coach (parent)**: behind a long-press. Box counts, cards promoted/demoted today, tricky
   words, reading-minute history, story track: current scaffold level, taps per sentence and read
   time per paragraph over time, questions that needed hint 3 twice, a "lower level silently"
   control; free-play minutes today and the daily cap setting; mock + answer key, export/import,
   "freeze streak" and "reset today" buttons.
6b. **Training grounds**: a menu of drills and re-reads, open only after the day's session;
   shows the free-play minutes left; nothing on it moves the map.
7. **Boss fight**: mixed 20–40 card run, no new content, result screen with the one number that
   matters ("you'd have scored 86") and the 5 cards to fix.
8. **Brag card**: auto-generated image for sharing (CD5), one tap.

### 9.3 Data model (minimal, per reference §9)

```
card: { id, type, wordId|grammarId, box (1–5), lastSession, misses, born (session) }
session: { n, date, reviewed, promoted, demoted, readingResults[3], minutes, thumbs }
word: { id, en, he, he2, emoji, chunks[], tip, lookalikeGroup, sentences[2], ownSentence }
paragraph: { id, tier, friend: { name, age, month, hobby, team, has[], likes, because },
             sentences[]: { en, he, keyWordIds[] }, questions[]: { type, en, he?, answer,
             choices[], evidenceSentence } }
storyRun: { paragraphId, session, level, taps, seconds, stars, hintsUsed[] }
track: { storyLevel (1–5), levelHistory[] }
```

### 9.4 Non-goals (v1)

No accounts, no multiplayer, no classmate leaderboard, no AI chat, no general English content
beyond Unit 1, no speech recognition, no push notifications (the parent is the notification).

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| He resists on day 2–3 (novelty gone, drives not yet carrying) | Session ≤ 12 min with a hard stop; parent plays the first week alongside; mystery box daily in week 1 |
| Recognition mastery masquerades as test readiness | Production + cloze cards dominate from day 6; paper mode days 11–13; mock test is the only "ready" signal |
| TTS voice is bad or missing on the device | Test on day 0; fallback MP3s for the 50 words |
| The "×" marks mean the opposite of what we assume | Placement round on day 0 overrides the sheet |
| Reading minute becomes a nagging moment | Parent only marks, never corrects mid-sentence; ✗ just means "again tomorrow" |
| Test turns out to ask for English spelling after all | Light production (tiles) is still in from Box 3; a coach toggle re-enables full weighting in a day |
| Solo sessions become a tap-through | Solo mode has no level-ups and no new content, so there is nothing to gain by rushing; "too fast" flag in the coach log; the completion code only appears after the hard-stop-or-complete event |
| Too many cards in Box 1 by day 5 | Daily cap + auto-pause of new content; 5 lands can stretch to 6 days |
| Paragraphs are where he shuts down | Never more than 5 sentences; level only rises, never visibly drops; hints are free; a paragraph is "done" when the questions are answered, not when every word was read right; the friend card is earned regardless of stars |
| Scaffolding never fades (he leans on word taps and Hebrew forever) | Level-up criteria are automatic and tap counts are shown as a quiet number from level 3; the day-12 unseen paragraph is the honest check; the parent's ✓ at level 5 is the last word |
| Session creeps past 15 min with three tracks | Review stack is the thing that gets trimmed; the story never is; new lands stop at day 5 |
| He binges and fakes mastery, or burns out by day 4 | Advancement is capped to the daily session; cards never move in free play; the parent caps free-play minutes |
| Free play becomes the only thing he wants (easy drills, wardrobe) | It's locked until the session is done, so the dose is always taken first; free play has no new content to pre-learn |

---

## 11. Open questions

Answered 7 Nov (now in §5): × marks = words he got wrong; test is EN→HE, word↔image, grammar
fill-in, reading passage, no HE→EN writing; iPad; he picks the theme; mostly parent sessions
with some solo afternoons; no book at home; coach only; suspected, unassessed reading difficulty.

Rewards decided 7 Nov: in-game loot, one boss prize (§7.5, §7.6).

Still open, none blocking the build:

1. **The boss prize**: agreed with him on day 0.
2. **Previous test** from this teacher, if one exists, to calibrate the mock's format and the
   passage length.
3. **Dyslexia screening**: not for this test, but worth doing after it. The coach log (taps per
   sentence, read times, look-alike confusions) will be useful evidence either way.
4. **Printer**: is one reachable for the day-12 mock? If not, the passage is handwritten by the
   parent (§6.4). Decide by day 10.

---

## 12. Build plan

| Milestone | Lands | Contains |
|---|---|---|
| M0 | today, 7 Nov | PRD approved; answers to §11; word list verified against the book |
| Design pass ✅ | Sun 8 Nov | **Done** (v1.1.0). Skin-driven visual identity via CSS tokens on `body[data-skin]`: textured backgrounds (starfield / grid / parchment, inline SVG, offline-safe), chunky pressable buttons and option tiles, a winding SVG trail map with locked/current/done nodes instead of a grid, a Hebrew display face per skin for titles only (Suez One / Karantina / Rubik Bubbles via Google Fonts, system fallback), live theme preview while choosing a skin. The reading surface (cards, options, English text) stays light and plain in every skin. |
| M1 ✅ | Sun 8 Nov | **Done.** Content file, Leitner engine, Recognition / Sound-lineup / Word↔Image cards, TTS, map with 3 skins, session loop with solo/parent mode and completion code, hard stop, minimal training grounds with parent cap, coach screen, export/import, reading-friendly typography, local save. Tested in the Mac browser at iPad size through three simulated days. Not yet tested on a real iPad (voice quality, Add to Home Screen). See `README.md` to run and publish. |
| **Publish** | Sun 8 Nov, after M1 | **Yair, manually, from the personal GitHub account**: create the Pages repo with an unguessable name, push the files, open the URL on the iPad, Add to Home Screen. This must happen before day 0/1, because the save lives at that URL from the first session. Every later milestone is a push to the same repo; no second publish step. |
| M2 | Tue 10 Nov | Copy pass (all strings in one table, new voice). Noun→pronoun card. Story track v1: tier-A paragraphs, scaffold levels 1–3, hint ladder, friend cards. Tile production, grammar cards (tower 1 = to be only), sentence builder, reading minute, coach log, mystery box with loot tiers and a cosmetics wardrobe, streak + freeze, brag card |
| M3 | Thu 12 Nov | Mid-boss, trophy shelf, tricky-word flow, own-sentence cards, export/import. Story track v2: tiers B–C, levels 4–5, repeated-reading scheduler, warm read, timing. Training grounds: drills, re-reads, memory game, parent cap (a minimal "replay Box 1" version ships in M1 so the cap exists from day 1) |
| M4 | Mon 16 Nov | Test-mode screen (worksheet look, self-marking against the key), one printable full mock + answer key, "about me" template, final boss with unseen paragraph, speed round |
| M5 | Thu 19 Nov | Tuning from 10 days of session logs; nothing new |

"Deployment last" means the last step of M1, not after M5: the kid needs the URL from his first
session. If publishing slips, days 0–1 can run on the iPad over the local network while the
Mac is awake, but the save made there is lost when he moves to the real URL (different origin),
so keep that to a day at most or use the export/import.

Everything is a single HTML file plus a JSON content file, so each milestone is a drop-in replace
that keeps his save.
