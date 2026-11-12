# The Leitner System — Working Reference

A paraphrased working reference on the Leitner flashcard method, written so it can be applied to
study-plan and app design. Companion to `actionable-gamification-reference.md`.

---

## 1. What it is, in one paragraph

The Leitner System is a paper-era implementation of **spaced repetition** using flashcards sorted
into a small number of boxes. Every card starts in Box 1. Each box has a review frequency: Box 1 is
reviewed most often, the last box least often. When you recall a card correctly it is **promoted** to
the next box, so you see it less often; when you fail it, it is **demoted** to Box 1 (or one box
down), so you see it more often. The result is that your limited study time flows automatically to
the cards you don't yet know, while cards you do know are checked just often enough to keep them.

---

## 2. Origin

- Devised by **Sebastian Leitner**, an Austrian-born German science journalist (1919–1989), and
  published in his 1972 book *So lernt man lernen* ("How to learn to learn"), still in print.
- Leitner's physical design was a single **Lernkartei** (learning card file): one box with **five
  compartments** whose widths grew roughly **1 cm, 2 cm, 5 cm, 8 cm, 14 cm**. The compartment size
  *was* the schedule: you worked on a compartment when it filled up. A narrow Compartment 1 filled
  every day; the wide Compartment 5 took weeks. Cards in Compartment 5 that were still correct left
  the box as "known".
- He framed it as a way to make learning (vocabulary especially) less wasteful: stop re-reading what
  you already know, and make yourself actively recall instead of passively re-read.

---

## 3. The mechanics

### Rules
1. All new cards go in **Box 1**.
2. Review a box on its schedule. For each card, try to **recall the answer before turning it over**
   (active recall, never re-reading).
3. **Correct → move up one box.** Wrong → move **back to Box 1** (classic), or down one box (gentler
   variant).
4. The last box is either reviewed rarely (e.g. monthly) or treated as **"retired/mastered"** and
   only spot-checked.
5. Keep adding new cards to Box 1 at a sustainable rate.

### Common schedules
Leitner's book gives the compartment sizes, not a calendar. Modern users attach intervals. Any of
these are "the Leitner System"; pick based on how far away the exam is.

| Variant | Box 1 | Box 2 | Box 3 | Box 4 | Box 5 | Box 6 | Box 7 |
|---|---|---|---|---|---|---|---|
| 3-box (quick) | daily | every 3 days | weekly | | | | |
| 5-box doubling | 1 d | 2 d | 4 d | 8 d | 16 d | | |
| 5-box classic | daily | every 3 days | weekly | every 2 weeks | monthly | | |
| 7-box | 1 d | 2 d | 4 d | 8 d | 16 d | 32 d | 64 d |

Rule of thumb: the intervals should **roughly double**. Compressed for a near exam (1-2-4-7 days),
stretched for long-term retention.

### The "schedule" variant (Wikipedia's description)
Rather than a per-box calendar, number sessions and give each box a list of session numbers on
which it is reviewed. For example, in a cycle of 10 sessions: Box 1 every session, Box 2 on sessions
2,4,6,8,10, Box 3 on 3,6,9, etc. Variants ("proficiency levels" with 0-7 and cards keyed by the
session on which they next appear) let one deck run indefinitely without a calendar. This is what
most apps actually implement under the Leitner name.

### Review order inside a session
- Review the **highest box due first**, then work down to Box 1. Cards that fail from a high box
  drop into Box 1 and are then seen again at the end of the same session.
- Shuffle each box before reviewing to avoid learning the order instead of the content.

---

## 4. Why it works — the science it packages

- **Spacing effect** (Ebbinghaus, 1885; Cepeda et al. 2006 meta-analysis): the same study time
  spread over several sessions produces far better retention than one massed session.
- **Forgetting curve**: memory decays fast then slows; each successful retrieval at the right moment
  resets and flattens the curve. The expanding intervals are a rough approximation of "review just
  before you'd forget".
- **Testing effect / retrieval practice** (Roediger & Karpicke 2006): recalling an answer strengthens
  memory far more than re-reading it. The flip-and-check step is the active ingredient; the boxes
  only schedule it.
- **Desirable difficulties** (Bjork): effortful recall that nearly fails is the most productive.
  The Leitner demotion rule guarantees hard cards get the most practice.
- **Expanding retrieval**: intervals that grow after each success. Evidence is mixed on whether
  expanding beats equal spacing, but both beat massed practice. Leitner uses expanding spacing because
  it also minimises total workload.
- **Triage**: the practical win. You never waste time on known cards and never neglect unknown ones.

---

## 5. Strengths and weaknesses

**Strengths**
- Needs no software. A child can run it with a shoebox and index cards.
- Transparent: the learner *sees* their progress as cards physically migrate rightward. This
  visibility is itself motivating (see §8).
- Self-correcting workload: hard material automatically gets more exposure.
- Cheap to start, easy to explain in one minute.

**Weaknesses**
- **Fixed intervals per box**, not per card. A card that's easy for you and a card that's hard for
  you sit in the same box on the same schedule. Algorithms like SM-2 (SuperMemo/Anki) and FSRS
  (Anki ≥ 23.10) compute a personal interval per card from its history, and are more efficient
  over months and thousands of cards. SuperMemo's author argues Leitner is barely spaced repetition
  at all for that reason; in practice for a few hundred cards over a few weeks the difference is small.
- **Harsh demotion**: a single lapse sends a mature card to Box 1, which over-reviews it. The
  "drop one box" variant fixes this at the cost of slightly less reinforcement.
- **No per-card timestamps** on paper: if you skip a day, Box 1 is simply "late"; the schedule is
  by session, not by date, unless you keep a log.
- **Leeches**: cards that bounce between Box 1 and 2 forever. Needs a rule: after N failures, rewrite
  the card (it's probably badly written or two facts in one).
- Only trains what fits on a card: isolated facts, vocabulary, formulas, definitions. Poor for
  skills, essay writing, or anything requiring integration.

---

## 6. Card design (the part most people get wrong)

- **One fact per card.** "Three meanings of X" is three cards.
- **Both directions** for vocabulary: L1→L2 (production) and L2→L1 (recognition) as separate cards.
  Production is harder and is what exams usually test.
- **Context beats isolation**: put the word in a short sentence with the target blanked (cloze), or
  include a collocation. "to *make* a decision" not just "make".
- **Minimum information principle**: short question, short answer. A long card is a card you'll fail.
- Add a **cue**, image, or mnemonic on the answer side if the card keeps failing.
- Keep answer criteria strict: "almost" is a fail. Softness here destroys the triage.
- Write cards from errors: anything missed on a practice test becomes a card the same day.

---

## 7. Practical setup for an exam in a few weeks

1. Count the days until the exam (D). Pick a box schedule whose last interval ≤ D/2, so every card
   can reach the top box at least once before the test.
2. Set a **daily cap** on new cards (e.g. 10–20) so Box 1 never balloons. Box 1 should be reviewable
   in ~10 minutes.
3. Do the session at a **fixed time** (habit anchor). Reviewing is non-negotiable; adding new cards
   is optional on hard days.
4. Track three numbers daily: cards in each box, cards promoted, cards demoted. This is the
   progress bar.
5. Last 3–4 days before the exam: stop adding, review every box once, and run Box 1–2 twice daily.
6. After the exam, cards in the top box can be archived or moved to a long-interval "maintenance" box.

---

## 8. Hooks for gamification (link to the Octalysis reference)

The Leitner System is already a tiny game; it maps cleanly onto Chou's Core Drives:

| Leitner feature | Core Drive | Technique |
|---|---|---|
| Cards migrating rightward through boxes | CD2 Accomplishment | Progress Bar, Milestone Unlocks |
| A card dropping back to Box 1 | CD8 Loss & Avoidance | Progress Loss (keep it felt, not punitive) |
| "Due today" boxes | CD6 Scarcity / Appointment Dynamics | Come back tomorrow for Box 2 |
| Not knowing which card comes next | CD7 Unpredictability | Shuffle; occasional bonus/surprise card |
| A "mastered" shelf of retired cards | CD4 Ownership, CD5 Trophy Shelf | Collection Set |
| Writing your own cards | CD3 Creativity, CD4 Build-From-Scratch | Ownership of the deck |
| Daily streak of completed sessions | CD2 + CD8 | Streaks; make them recoverable |
| Parent/tutor seeing the box counts | CD5 Social Influence | Mentorship, Brag Button |
| Why this matters (the test, the goal beyond it) | CD1 Epic Meaning | Narrative |

Design cautions from Octalysis: keep CD8 (demotion, streak loss) White-Hat-balanced with visible
CD2 gains, or the learner feels punished and quits. Use CD6 (locked boxes until due) for urgency,
but let the top-box "mastered" collection (CD4) carry long-term pride.

---

## 9. Digital implementations worth knowing

- **Anki**: SM-2-derived and FSRS schedulers; not Leitner, but the most used spaced-repetition tool.
- Leitner-style apps: many simple flashcard apps (e.g. "Leitner Box" style apps, Langeek, Mindomax)
  implement fixed per-box intervals with promote/demote rules; some offer the "drop one box" variant.
- A faithful digital Leitner needs only: card, box number, next-due date (or next-due session),
  fail count (for leech handling).

---

## 10. One-minute explanation for a learner

"Every card starts in the first box. Each day you test yourself on the first box. Get it right, it
moves to the second box, which you only look at every few days. Get it wrong, it goes back to the
first box. Cards you know keep moving right and you see them less and less; cards you don't know keep
coming back until you do. Your job is to empty the first box."
