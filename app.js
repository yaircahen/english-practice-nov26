/* Hey! Unit 1 game — M1 playable core + M2 (grammar towers, writing track, story track).
   Vanilla JS, no build step. State in localStorage. See prd.md (v4). */
(() => {
  'use strict';
  const C = window.CONTENT;
  const ALL_WORDS = [...C.words, ...(C.starter || [])];
  const WORDS = Object.fromEntries(ALL_WORDS.map(w => [w.id, w]));
  const WORD_LAND = {};
  C.lands.forEach(l => l.words.forEach(w => { WORD_LAND[w] = l.id; }));
  // Non-word card items (M2): grammar cloze (gc), noun→pronoun (np), same-or-different (sd).
  // The card type is the item's kind, so a card id is `${item.id}|${kind}`.
  const GITEMS = {};
  (C.units || []).forEach(u => {
    u.items.forEach(it => { GITEMS[it.id] = Object.assign({ kind: 'gc', pack: u.id }, it); });
    (u.bridge || []).forEach(it => { GITEMS[it.id] = Object.assign({ kind: 'np', pack: u.id }, it); });
  });
  (C.sameDiff || []).forEach(it => { GITEMS[it.id] = Object.assign({ kind: 'sd', pack: 'sd' }, it); });
  const UNIT_TOWER = {};
  C.grammar.forEach(g => (g.units || []).forEach(u => { UNIT_TOWER[u] = g.id; }));
  const STORIES = C.stories || [];
  const STORY = Object.fromEntries(STORIES.map(p => [p.id, p]));
  const STORAGE_KEY = 'hey1-game-v1';
  const $app = document.getElementById('app');
  const $fx = document.getElementById('fx');

  // ---------- utils ----------
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const pad2 = n => String(n).padStart(2, '0');
  const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const addDays = (str, k) => { const [y, m, d] = str.split('-').map(Number); const dt = new Date(y, m - 1, d + k); return todayStr(dt); };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hashCode = str => { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const minutes = ms => Math.round(ms / 60000);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- state ----------
  function freshState() {
    return {
      version: 1, hero: null, createdAt: Date.now(), sessionCount: 0,
      cards: {}, landsIntroduced: [], days: {},
      settings: { freePlayCapMin: C.freePlayCapMinDefault, autoSpeak: true },
      log: [],
      // M2. All of these are absent from an M1 save and get these defaults on load.
      packsIntroduced: [],                                   // [{ id, date }] grammar units and the same/different pack
      story: { level: 1, clean: 0, done: {}, runs: [] },     // done[passageId] = { stars, total, date, reads }
      writing: { rung: 1, clean: 0, seq: 0, again: [], history: [] },
    };
  }
  let S = load();
  function load() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.version === 1) return Object.assign(freshState(), s); } } catch (e) { /* fall through */ }
    return freshState();
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { toast('השמירה נכשלה'); } }
  function logEvent(type, data) { S.log.push(Object.assign({ t: Date.now(), type }, data || {})); if (S.log.length > 2000) S.log.splice(0, S.log.length - 2000); }

  const skin = () => C.skins[(S.hero && S.hero.skin) || 'map'];
  const landName = l => l.starter ? skin().starterName : skin().names[l.id - 1];
  const landIcon = l => l.starter ? skin().starterIcon : skin().terrIcons[l.id - 1];
  const landNewLabel = l => l.starter ? skin().starterNew : skin().newTerritory;
  const today = () => S.days[todayStr()] || (S.days[todayStr()] = { freePlaySec: 0 });

  // ---------- audio ----------
  const Audio = {
    ctx: null, voice: null,
    init() {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      this.pickVoice();
    },
    pickVoice() {
      if (!('speechSynthesis' in window)) return;
      const vs = speechSynthesis.getVoices();
      if (!vs.length) return;
      const pref = ['Samantha', 'Google US English', 'Alex', 'Ava', 'Allison'];
      this.voice = vs.find(v => pref.includes(v.name) && v.lang.startsWith('en')) || vs.find(v => v.lang === 'en-US') || vs.find(v => v.lang.startsWith('en')) || null;
    },
    speaking: false,
    stop() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* ignore */ } this.speaking = false; },
    speak(text, rate = 0.85) {
      if (!('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = rate; u.pitch = 1;
        if (this.voice) u.voice = this.voice;
        this.speaking = true;
        u.onend = u.onerror = () => { this.speaking = false; };
        speechSynthesis.speak(u);
      } catch (e) { this.speaking = false; }
    },
    // run fn after at least minMs, and after speech ends, but no later than maxMs
    afterSpeech(fn, minMs, maxMs) {
      const t0 = Date.now(); let done = false;
      const fire = () => { if (!done) { done = true; fn(); } };
      const poll = () => { if (done) return; const el = Date.now() - t0; if ((el >= minMs && !this.speaking) || el >= maxMs) fire(); else setTimeout(poll, 60); };
      setTimeout(poll, minMs);
    },
    tone(freq, dur, type = 'sine', gain = 0.15, when = 0) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    },
    ding(combo) { const f = 660 * (1 + Math.min(combo, 12) * 0.045); this.tone(f, 0.12, 'sine', 0.12); this.tone(f * 1.5, 0.18, 'sine', 0.1, 0.09); },
    hm() { this.tone(220, 0.18, 'triangle', 0.08); this.tone(180, 0.22, 'triangle', 0.06, 0.12); },
    whoosh() { if (!this.ctx) return; const t0 = this.ctx.currentTime; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(300, t0); o.frequency.exponentialRampToValueAtTime(900, t0 + 0.25); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3); o.connect(g); g.connect(this.ctx.destination); o.start(t0); o.stop(t0 + 0.32); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.12, i * 0.12)); },
    thud() { this.tone(120, 0.15, 'sine', 0.1); },
  };
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => Audio.pickVoice();
  document.addEventListener('pointerdown', () => Audio.init(), { once: true });

  // ---------- effects ----------
  let toastTimer = null;
  function toast(msg, ms = 3500) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }
  function confetti(n = 70) {
    const colors = ['#d7a62a', '#2f6f4e', '#c47b3a', '#5b3a8a', '#2b4c7e', '#e05a7a'];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div'); d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw'; d.style.background = colors[i % colors.length];
      d.style.animationDelay = (Math.random() * 0.5) + 's'; d.style.transform = `rotate(${Math.random() * 360}deg)`;
      $fx.appendChild(d); setTimeout(() => d.remove(), 2400);
    }
  }

  // ---------- cards / Leitner ----------
  const cardId = (wid, type) => `${wid}|${type}`;
  function cardTypesFor(w) { const t = ['rec', 'lineup']; if (w.emoji) t.push('img'); return t; }
  function ensureCards(wordIds, sessionN) {
    wordIds.forEach(wid => cardTypesFor(WORDS[wid]).forEach(type => {
      const cid = cardId(wid, type);
      if (!S.cards[cid]) S.cards[cid] = { box: 1, lastSession: 0, misses: 0, born: sessionN, priority: 0 };
    }));
  }
  function parseCard(cid) { const [wid, type] = cid.split('|'); return { cid, word: WORDS[wid], g: GITEMS[wid], type, st: S.cards[cid] }; }
  // a card whose item is no longer in the content (renamed or removed) is skipped, never crashed on
  function known(cid) { const p = parseCard(cid); return !!(p.word || p.g); }
  function cardLabel(cid) { const p = parseCard(cid); if (p.word) return p.word.en; if (!p.g) return cid; return p.g.t ? p.g.t.replace('___', `[${p.g.a}]`) : (p.g.en ? `${p.g.en} → ${p.g.a}` : `${(p.g.pic || p.g.lines).join(' / ')} → ${p.g.a}`); }
  const packCards = id => Object.values(GITEMS).filter(g => g.pack === id).map(g => cardId(g.id, g.kind));
  function ensureItemCards(cids, sessionN) { cids.forEach(cid => { if (!S.cards[cid]) S.cards[cid] = { box: 1, lastSession: 0, misses: 0, born: sessionN, priority: 0 }; }); }
  function packIntroduced(id) { return S.packsIntroduced.some(p => p.id === id); }
  function towerProgress(g) {
    let total = 0, mastered = 0;
    (g.units || []).forEach(u => packCards(u).forEach(cid => { const st = S.cards[cid]; if (st) { total++; if (st.box >= 4) mastered++; } }));
    return { total, mastered, pct: total ? Math.round(100 * mastered / total) : 0, open: (g.units || []).some(packIntroduced) };
  }
  function isDue(st, n) { if (st.box >= 5) return false; return (n - st.lastSession) >= C.intervals[st.box]; }
  function boxCounts() { const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; Object.values(S.cards).forEach(st => c[st.box]++); return c; }
  function landProgress(land) {
    let total = 0, mastered = 0;
    land.words.forEach(wid => cardTypesFor(WORDS[wid]).forEach(type => { const st = S.cards[cardId(wid, type)]; if (st) { total++; if (st.box >= 4) mastered++; } }));
    return { total, mastered, pct: total ? Math.round(100 * mastered / total) : 0 };
  }
  function landIntroduced(id) { return S.landsIntroduced.some(l => l.id === id); }
  function nextLandForToday() {
    if (S.landsIntroduced.some(l => l.date === todayStr())) return null;
    return C.lands.find(l => !landIntroduced(l.id)) || null;
  }
  function masteredWordCount() {
    return C.words.filter(w => { const st = S.cards[cardId(w.id, 'rec')]; return st && st.box >= 5; }).length;
  }
  function streak() {
    let n = 0; let d = todayStr();
    if (!(S.days[d] && S.days[d].session)) d = addDays(d, -1);
    while (S.days[d] && S.days[d].session) { n++; d = addDays(d, -1); }
    return n;
  }
  function todayDone() { const d = S.days[todayStr()]; return !!(d && d.session); }

  // distractors
  function hebrewOptions(word) {
    const same = ALL_WORDS.filter(w => w.id !== word.id && w.he !== word.he && WORD_LAND[w.id] === WORD_LAND[word.id]);
    const others = ALL_WORDS.filter(w => w.id !== word.id && w.he !== word.he && WORD_LAND[w.id] !== WORD_LAND[word.id] && !!w.starter === !!word.starter);
    const pool = sample(same, 3); if (pool.length < 3) pool.push(...sample(others, 3 - pool.length));
    return shuffle([word, ...pool]);
  }
  function englishOptions(word) {
    const candidates = ALL_WORDS.filter(w => w.id !== word.id);
    const grp = candidates.filter(w => w.group === word.group);
    const letter = candidates.filter(w => w.group !== word.group && w.en[0] === word.en[0]);
    const len = candidates.filter(w => w.group !== word.group && w.en[0] !== word.en[0] && Math.abs(w.en.length - word.en.length) <= 1);
    const rest = candidates.filter(w => !grp.includes(w) && !letter.includes(w) && !len.includes(w));
    const pool = []; for (const bucket of [grp, letter, len, rest]) { if (pool.length >= 3) break; pool.push(...sample(bucket, 3 - pool.length)); }
    return shuffle([word, ...pool]);
  }
  function emojiOptions(word) {
    const pool = sample(ALL_WORDS.filter(w => w.emoji && w.id !== word.id && w.emoji !== word.emoji && !!w.starter === !!word.starter), 3);
    if (pool.length < 3) pool.push(...sample(ALL_WORDS.filter(w => w.emoji && w.id !== word.id && !pool.includes(w)), 3 - pool.length));
    return shuffle([word, ...pool]);
  }

  // ---------- session runtime ----------
  let R = null;     // quest session
  let P = null;     // practice (training grounds)
  let view = 'map';

  function buildReviewQueue(n, cap = C.reviewStackCap) {
    const due = Object.keys(S.cards).filter(cid => known(cid) && isDue(S.cards[cid], n));
    const pri = due.filter(cid => S.cards[cid].priority > 0);
    const rest = due.filter(cid => S.cards[cid].priority === 0);
    const byBox = {}; rest.forEach(cid => { const b = S.cards[cid].box; (byBox[b] = byBox[b] || []).push(cid); });
    let q = [...shuffle(pri)];
    for (const b of [4, 3, 2, 1]) if (byBox[b]) q.push(...shuffle(byBox[b]));
    if (q.length > cap) {
      // what gives way first: recognition cards of words already in Box 3 and up (PRD §7.4)
      const easy = cid => !!parseCard(cid).word && S.cards[cid].box >= 3 && !S.cards[cid].priority;
      const keep = q.filter(cid => !easy(cid)), drop = q.filter(easy);
      q = keep.length >= cap ? keep.slice(0, cap) : [...keep, ...drop.slice(0, cap - keep.length)];
      q.sort((a, b) => (S.cards[b].priority - S.cards[a].priority) || (S.cards[b].box - S.cards[a].box));   // stable: keeps the shuffle inside a box
    }
    return q.map(cid => ({ cid, retry: false, retries: 0 }));
  }

  // ----- what a session holds (PRD §7.4, §8). Everything is state-driven, not calendar-driven. -----
  const CARDS_PER_MIN = 7;                                   // planning estimate only
  const landIn = (id, newLand) => landIntroduced(id) || !!(newLand && newLand.id === id);
  // one grammar unit a day, in parent sessions, once land 2 is in
  function unitForToday(newLand) {
    if (!landIn(2, newLand)) return null;
    if (S.packsIntroduced.some(p => p.date === todayStr() && p.id !== 'sd')) return null;
    return (C.units || []).find(u => !packIntroduced(u.id)) || null;
  }
  // the same/different pack opens with land 4, which holds those two words
  const sdForToday = newLand => !packIntroduced('sd') && landIn(4, newLand) && packCards('sd').length > 0;
  function storyForSession(mode, newLand) {
    if (!STORIES.length) return null;
    const runsToday = S.story.runs.filter(r => r.date === todayStr());
    if (mode === 'parent' && landIn(2, newLand) && !runsToday.some(r => !r.reread)) {
      const p = STORIES.find(x => !S.story.done[x.id]);
      if (p) return { p, reread: false };
    }
    // nothing new to open (solo sessions never open new content): visit the last friend again, once a day
    const last = S.story.runs.length ? STORY[S.story.runs[S.story.runs.length - 1].pid] : null;
    return last && !runsToday.length ? { p: last, reread: true } : null;
  }
  // the writing track opens with the first grammar unit; without a parent it stays on the tile rungs
  function writingForSession(mode, unit) {
    if (!(packIntroduced('u1') || (unit && unit.id === 'u1'))) return null;
    const rung = mode === 'parent' ? S.writing.rung : Math.min(S.writing.rung, 2);
    return { rung, paper: rung >= 3 };
  }
  const estStory = s => s.reread ? 2.5 : (s.p.tier === 'A' ? 3 : 4.5);
  const estWriting = w => w.paper ? 3 : 1.5;

  function startSession(mode) {
    const n = S.sessionCount + 1;
    const parent = mode === 'parent';
    const newLand = parent ? nextLandForToday() : null;
    const unit = parent ? unitForToday(newLand) : null;
    const sd = parent ? sdForToday(newLand) : false;
    const story = storyForSession(mode, newLand);
    const writing = writingForSession(mode, unit);
    // the review stack is what gives way to everything else in the sitting
    const other = (newLand ? 3.5 : 0) + (unit ? 2 : 0) + (sd ? 1 : 0) + (writing ? estWriting(writing) : 0) + (story ? estStory(story) : 0) + 1;
    const cap = clamp(Math.floor((C.sessionHardStopMin - other) * CARDS_PER_MIN), 8, C.reviewStackCap);
    const queue = buildReviewQueue(n, cap);
    if (!queue.length && !newLand && !unit && !sd && !writing && !story) {
      toast(mode === 'solo' && !Object.keys(S.cards).length ? 'את הראשונה עושים עם הורה 👨‍👩‍👦' : 'הכול נח עד מחר 😴', 4500);
      view = 'map'; render(); return;
    }
    R = {
      n, mode, date: todayStr(), startedAt: Date.now(), phase: 'review', phaseAt: Date.now(), timing: {}, queue, current: null,
      reviewTotal: queue.length, round: { title: 'חזרה', total: queue.length },
      done: 0, correct: 0, wrong: 0, promoted: 0, demoted: 0, combo: 0, maxCombo: 0,
      newLand, introIdx: 0, mastered: [], hardStop: false, firstTry: {},
      plan: { unit, sd, writing, story }, pack: null, packsDone: [], w: null, st: null, wResult: null, stResult: null,
    };
    logEvent('session_start', { n, mode });
    view = 'mission'; render();
  }

  function elapsedMin() { return (Date.now() - R.startedAt) / 60000; }
  function setPhase(p) { const now = Date.now(); R.timing[R.phase] = (R.timing[R.phase] || 0) + (now - R.phaseAt); R.phase = p; R.phaseAt = now; }
  // minutes still owed to the parts that are never cut (writing, story) and to today's new content
  function estLong() { const pl = R.plan; return (pl.writing && !R.wResult ? estWriting(pl.writing) : 0) + (pl.story && !R.stResult ? estStory(pl.story) : 0); }
  function estNew() { return (R.newLand && !landIntroduced(R.newLand.id) ? 3.5 : 0) + (R.plan.unit && !packIntroduced(R.plan.unit.id) ? 2 : 0) + (R.plan.sd && !packIntroduced('sd') ? 1 : 0); }
  const minLeft = () => C.sessionHardStopMin - elapsedMin();
  // review stops early enough to leave room for the new content and the long forms; new-content rounds
  // stop early enough to leave room for the long forms; the long forms themselves are never cut
  function cardTimeUp() { return minLeft() <= estLong() + (R.phase === 'review' ? estNew() : 0); }

  function nextCard() {
    if (!R) return;
    if (R.queue.length && cardTimeUp()) { R.hardStop = true; R.queue = []; }
    if (!R.queue.length) return afterRound();
    R.current = R.queue.shift();
    R.current.view = makeCardView(R.current.cid);
    view = 'card'; render();
  }

  // a card round (review, a new land, a grammar pack) has ended, or its time ran out
  function afterRound() {
    const room = () => minLeft() > estLong();
    if (R.phase === 'review' && R.newLand && !landIntroduced(R.newLand.id) && room()) { setPhase('intro'); R.introIdx = 0; view = 'intro'; return render(); }
    const pack = room() ? nextPack() : null;
    if (pack) return openPack(pack);
    startWriting();
  }
  function nextPack() {
    const pl = R.plan;
    if (pl.unit && !packIntroduced(pl.unit.id) && landIntroduced(2)) return { id: pl.unit.id, unit: pl.unit };
    if (pl.sd && !packIntroduced('sd') && landIntroduced(4)) return { id: 'sd', unit: null };
    return null;
  }
  function openPack(pack) {
    R.pack = pack;
    if (pack.unit) { setPhase('pintro'); view = 'pintro'; return render(); }
    beginPackRound();
  }
  function beginPackRound() {
    const pack = R.pack; const cids = packCards(pack.id);
    ensureItemCards(cids, R.n);
    S.packsIntroduced.push({ id: pack.id, date: todayStr() }); R.packsDone.push(pack.id); save();
    logEvent('pack_intro', { id: pack.id });
    // the noun→pronoun bridge cards come first, then the cloze cards
    const bridge = cids.filter(c => c.endsWith('|np')), rest = cids.filter(c => !c.endsWith('|np'));
    R.queue = [...shuffle(bridge), ...shuffle(rest)].map(cid => ({ cid, retry: false, retries: 0 }));
    setPhase('pack'); R.done = 0;
    R.round = { title: pack.unit ? `${skin().tower} <span class="en">${esc(pack.unit.title)}</span>` : '<span class="en">same · different</span>', total: R.queue.length };
    nextCard();
  }

  function makeCardView(cid) {
    const { word, type, g } = parseCard(cid);
    if (g) {
      const opts = g.kind === 'sd' ? ['same', 'different'] : g.o;
      return { kind: g.kind, g, options: shuffle(opts).map(o => ({ id: o, en: o })), answerId: g.a, say: g.kind === 'gc' ? g.t.replace('___', g.a) : (g.kind === 'np' ? `${g.en}. ${g.a}.` : g.a) };
    }
    if (type === 'rec') return { kind: 'rec', prompt: word, options: hebrewOptions(word), answerId: word.id };
    if (type === 'lineup') return { kind: 'lineup', prompt: word, options: englishOptions(word), answerId: word.id };
    const toEmoji = Math.random() < 0.5;
    return { kind: toEmoji ? 'img' : 'img-rev', prompt: word, options: emojiOptions(word), answerId: word.id };
  }

  function applyAnswer(item, correct, practice) {
    const st = S.cards[item.cid];
    if (!practice && !item.retry) {
      st.lastSession = R.n; st.priority = 0;
      if (correct) { if (st.box < 5) { st.box++; R.promoted++; if (st.box === 5) R.mastered.push(item.cid); } }
      else { st.misses++; if (st.box > 1) { st.box--; R.demoted++; } }
    }
    if (practice) {
      P.seen++;
      if (!correct) { P.misses[item.cid] = (P.misses[item.cid] || 0) + 1; if (P.misses[item.cid] >= 3) st.priority = 1; }
    }
    const rt = practice ? P : R;
    if (correct) { rt.correct++; rt.combo++; rt.maxCombo = Math.max(rt.maxCombo, rt.combo); }
    else { rt.wrong++; rt.combo = 0; if (item.retries < 2) rt.queue.push({ cid: item.cid, retry: true, retries: item.retries + 1 }); }
    save();
  }

  function finishSession() {
    if (R.mode === 'parent' && R.newLand && !landIntroduced(R.newLand.id)) {
      // hard stop hit before the new land was reached: it stays for the next parent session
      R.newLand = null;
    }
    setPhase('close');
    const dur = Date.now() - R.startedAt;
    S.sessionCount = R.n;
    const code = String(hashCode(`${R.n}-${R.date}-hey1`) % 10000).padStart(4, '0');
    const secs = {}; Object.entries(R.timing).forEach(([k, ms]) => { secs[k] = Math.round(ms / 1000); });
    const rec = {
      n: R.n, mode: R.mode, startedAt: R.startedAt, durationMs: dur, correct: R.correct, wrong: R.wrong,
      promoted: R.promoted, demoted: R.demoted, maxCombo: R.maxCombo, hardStop: R.hardStop,
      newLand: R.newLand ? R.newLand.id : null, mastered: R.mastered.length, code,
      packs: R.packsDone, secs, writing: R.wResult, story: R.stResult,   // per-step log for the coach screen
    };
    today().session = rec;
    logEvent('session_end', rec);
    save();
    view = 'close'; render();
  }

  // ---------- training grounds ----------
  function startPractice() {
    const cap = S.settings.freePlayCapMin * 60;
    if (today().freePlaySec >= cap) { toast('המגרש סגור להיום 🔒'); return; }
    const q = practicePool().map(cid => ({ cid, retry: false, retries: 0 }));
    if (!q.length) { toast('עוד אין קלפים לאימון'); return; }
    P = { queue: q, current: null, seen: 0, correct: 0, wrong: 0, combo: 0, maxCombo: 0, misses: {}, startedAt: Date.now(), lastTick: Date.now() };
    logEvent('practice_start', {});
    nextPracticeCard();
  }
  function practicePool() {
    const all = Object.keys(S.cards).filter(known);
    const low = all.filter(cid => S.cards[cid].box <= 2);
    return shuffle(low.length ? low : all);
  }
  function tickPractice() {
    if (!P) return;
    const now = Date.now(); today().freePlaySec += Math.round((now - P.lastTick) / 1000); P.lastTick = now; save();
    if (today().freePlaySec >= S.settings.freePlayCapMin * 60) { endPractice(true); return false; }
    return true;
  }
  function nextPracticeCard() {
    if (!tickPractice()) return;
    if (!P.queue.length) P.queue = practicePool().map(cid => ({ cid, retry: false, retries: 0 }));
    P.current = P.queue.shift(); P.current.view = makeCardView(P.current.cid);
    view = 'practice'; render();
  }
  function endPractice(capped) {
    if (P) { tickPractice(); logEvent('practice_end', { seen: P.seen, correct: P.correct, wrong: P.wrong }); }
    P = null; view = 'map'; render();
    if (capped) toast('המגרש נסגר. המאמן הלך לאכול 🍕', 4500);
  }

  // ---------- writing track (PRD §6.6) ----------
  // Four frames only: be1 "Dana is happy." · be2 "Maya and Noa are tall." · have1 "Omer has a dog." · have2 "Tom and Roni have a ball."
  // Rungs: 1 build with tiles · 2 build with capital letter and full stop · 3 build, then copy on paper ·
  // 4 write on paper from the picture and a word bank (rung 5, the full test task, arrives in M4).
  const WR = C.writing;
  function makeWSpec(frame, avoid) {
    const two = frame.endsWith('2'), be = frame.startsWith('be');
    const who = sample(WR.people.filter(p => !avoid.includes(p.name)), two ? 2 : 1).map(p => p.name);
    return { frame, who, x: sample(be ? WR.adjs : WR.nouns, 1)[0].w };
  }
  function wItem(spec) {
    const two = spec.frame.endsWith('2'), be = spec.frame.startsWith('be');
    const verb = be ? (two ? 'are' : 'is') : (two ? 'have' : 'has');
    const other = be ? (two ? 'is' : 'are') : (two ? 'has' : 'have');
    const tokens = [...(two ? [spec.who[0], 'and', spec.who[1]] : [spec.who[0]]), verb, ...(be ? [spec.x] : ['a', spec.x])];
    return { spec, two, be, verb, other, tokens, model: tokens.join(' ') + '.' };
  }
  function wPicture(it) {
    const adj = it.be ? WR.adjs.find(a => a.w === it.spec.x) : null;
    const noun = it.be ? null : WR.nouns.find(n => n.w === it.spec.x);
    const fig = name => {
      const p = WR.people.find(x => x.name === name) || { g: 'f' };
      const body = adj && adj.badge ? `<div class="wface">${adj.badge}</div>`
        : adj ? `<div class="wbody ${adj.size}">${p.g === 'f' ? '🧍‍♀️' : '🧍‍♂️'}</div>`
        : `<div class="wface">${p.g === 'f' ? '👧' : '👦'}</div>`;
      return `<div class="wfig">${body}<div class="wname en">${esc(name)}</div></div>`;
    };
    // tall and short need something to be tall or short next to: a door
    const extra = noun ? `<div class="wfig"><div class="wface">${noun.e}</div><div class="wname">&nbsp;</div></div>` : (adj && adj.size ? `<div class="wfig"><div class="wbody door">🚪</div><div class="wname">&nbsp;</div></div>` : '');
    return `<div class="wpic">${it.spec.who.map(fig).join('')}${extra}</div>`;
  }
  function wBank(it) {
    const list = it.be ? WR.adjs : WR.nouns;
    const others = sample(list.filter(x => x.w !== it.spec.x), 2).map(x => x.w);
    return shuffle([it.spec.x, ...others]).map(x => it.be ? x : `a ${x}`);
  }
  function newBuild(it, marks) {
    const target = marks ? [...it.tokens, '.'] : it.tokens.slice();
    const texts = [...target, it.other];                       // the other little word (is/are, has/have) is always on offer
    if (marks) texts.push(it.tokens[0].toLowerCase());         // and from rung 2, the name without its capital letter
    return { target, tray: shuffle(texts.map((text, i) => ({ id: 't' + i, text }))), slots: target.map(() => null), wrong: [], clean: true, solved: false, marks };
  }

  function startWriting() {
    // the plan was made before today's grammar unit opened, so check again now
    if (!R.plan.writing || !packIntroduced('u1')) { R.plan.writing = null; return startStory(); }
    const parent = R.mode === 'parent', wr = S.writing, odd = wr.seq % 2 === 1;
    const frames = packIntroduced('u2') ? [odd ? 'have2' : 'have1', odd ? 'be1' : 'be2'] : [odd ? 'be2' : 'be1', odd ? 'be1' : 'be2'];
    const specs = parent ? wr.again.slice(0, 2) : [];          // sentences marked "again" come back first, with a parent
    frames.forEach(f => { if (specs.length < 2) specs.push(makeWSpec(f, specs.flatMap(s => s.who))); });
    // a sitting that starts on the tile rungs stays on them: the pen comes out only when the mission screen said so
    R.w = { items: specs.map(wItem), idx: 0, parent, results: [], maxRung: parent && wr.rung >= 3 ? 4 : 2 };
    setPhase('writing');
    openWItem();
  }
  function openWItem() {
    const w = R.w, it = w.items[w.idx];
    w.rung = Math.min(S.writing.rung, w.maxRung);
    w.res = { model: it.model, rung: w.rung, tiles: null, paper: null };
    if (w.rung >= 4) { w.stage = 'write'; w.bank = wBank(it); } else { w.stage = 'build'; w.b = newBuild(it, w.rung >= 2); }
    view = 'writing'; render();
  }
  function wPlace(id) {
    const b = R.w.b; if (!b || b.solved || b.slots.includes(id)) return;
    const i = b.slots.indexOf(null); if (i < 0) return;
    b.slots[i] = id; b.wrong = [];
    if (b.slots.includes(null)) { Audio.tone(520, 0.05, 'sine', 0.05); return render(); }
    // strict marking: every tile must be exact; the wrong ones are shown so the miss teaches
    const text = t => b.tray.find(x => x.id === t).text;
    b.wrong = b.slots.map((t, k) => text(t) === b.target[k] ? -1 : k).filter(k => k >= 0);
    if (b.wrong.length) { b.clean = false; Audio.hm(); return render(); }
    b.solved = true; R.w.res.tiles = b.clean;
    Audio.ding(3); render();
    const model = R.w.items[R.w.idx].model; setTimeout(() => Audio.speak(model), 250);
  }
  function wUnplace(i) { const b = R.w.b; if (!b || b.solved || b.slots[i] == null) return; b.slots[i] = null; b.wrong = []; render(); }
  function wAfterBuild() {
    const w = R.w;
    if (w.rung === 3) { w.stage = 'copy'; return render(); }
    // rungs 1 and 2 take one clean sentence each, so the pen comes out on the second writing day
    if (w.parent && w.res.tiles && S.writing.rung === w.rung) { S.writing.rung++; save(); }
    wDone();
  }
  function wDone() {
    const w = R.w; w.results.push(w.res); w.idx++;
    if (w.idx < w.items.length) return openWItem();
    const wr = S.writing; const paper = w.results.filter(r => r.paper);
    if (w.parent) wr.again = w.results.map((r, i) => r.paper === 'again' ? w.items[i].spec : null).filter(Boolean);
    // from rung 3: one rung up after three clean parent sessions (rung 5 arrives in M4)
    if (w.parent && paper.length && paper.every(r => r.paper === 'ok') && w.results.every(r => r.tiles !== false)) {
      wr.clean++; if (wr.clean >= 3 && wr.rung === 3) { wr.rung = 4; wr.clean = 0; }
    }
    wr.seq++;
    R.wResult = { items: w.results };
    wr.history.push({ date: todayStr(), n: R.n, mode: R.mode, items: w.results }); if (wr.history.length > 40) wr.history.shift();
    logEvent('writing', { items: w.results }); save();
    R.w = null;
    startStory();
  }
  function writingView() {
    const w = R.w, it = w.items[w.idx]; const sub = `משפט ${w.idx + 1} מתוך ${w.items.length}`; const pic = wPicture(it);
    const pair = it.be ? ['is', 'are'] : ['has', 'have'];
    if (w.stage === 'build') {
      const b = w.b; const text = id => b.tray.find(t => t.id === id).text;
      const slots = b.slots.map((id, i) => `<button class="wslot ${id ? 'full' : ''} ${b.wrong.includes(i) ? 'wrong' : ''} ${b.solved ? 'ok' : ''}" data-action="w-slot" data-i="${i}">${id ? esc(text(id)) : ''}</button>`).join('');
      const tray = b.tray.map(t => { const used = b.slots.includes(t.id); return `<button class="wtile ${used ? 'used' : ''}" data-action="w-tile" data-id="${t.id}" ${used || b.solved ? 'disabled' : ''}>${esc(t.text)}</button>`; }).join('');
      const hint = b.wrong.length ? (b.wrong.length > 1 ? 'יש מילים שיושבות לא במקום שלהן. גע בהן והן יחזרו למטה.' : 'יש מילה שיושבת לא במקום שלה. גע בה והיא תחזור למטה.') : (b.marks ? 'גע במילים לפי הסדר. לשים לב איך מתחילים ואיך מסיימים.' : 'גע במילים לפי הסדר. אחת מהן סתם מתחזה.');
      return `
        ${topbar('🧩 בונים משפט', sub)}
        <div class="card wcard">${pic}
          <div class="wslots en">${slots}${b.marks ? '' : '<span class="wdot">.</span>'}</div>
          ${b.solved ? '' : `<div class="muted center">${hint}</div>`}
        </div>
        ${b.solved
          ? `<div class="feedback good"><span class="bigmark">✓</span><button class="btn primary" data-action="w-built">${w.rung === 3 ? 'ועכשיו עם עט ←' : 'הלאה ←'}</button></div>`
          : `<div class="wtray en">${tray}</div>`}`;
    }
    if (w.stage === 'copy') return `
        ${topbar('✍️ עכשיו עם עט', sub)}
        <div class="card wcard">${pic}
          <div class="wmodel en">${esc(it.model)}</div>
          <div class="center">להעתיק לדף. בדיוק ככה, אות אחרי אות.</div>
          <div class="bigcta"><button class="btn primary block" data-action="w-pendown">העט על השולחן</button></div>
        </div>`;
    if (w.stage === 'write') return `
        ${topbar('✍️ משפט על הדף', sub)}
        <div class="card wcard">${pic}
          <div class="wbank en">${w.bank.map(x => `<span>${esc(x)}</span>`).join('')}</div>
          <div class="center">משפט אחד על התמונה, עם <span class="en">${pair[0]}</span> או <span class="en">${pair[1]}</span>.</div>
          <div class="bigcta"><button class="btn primary block" data-action="w-pendown">העט על השולחן</button></div>
        </div>`;
    return `
        ${topbar('🔎 בודקים יחד', sub)}
        <div class="card wcard">
          <div class="wmodel en">${esc(it.model)}</div>
          <ol class="wchecks">
            <li>השם ראשון, עם אות גדולה.</li>
            <li>אחד ← <span class="en">${pair[0]}</span>. שניים ← <span class="en">${pair[1]}</span>.</li>
            <li>כל מילה בדיוק כמו ${w.rung >= 4 ? 'בבנק המילים' : 'על המסך'}, ונקודה בסוף.</li>
          </ol>
          <div class="row wrap" style="justify-content:center; gap:14px">
            <button class="btn primary" data-action="w-ok">✓ שלוש מתוך שלוש</button>
            <button class="btn" data-action="w-again">🔁 סיבוב נוסף מחר</button>
          </div>
        </div>`;
  }

  // ---------- story track (PRD §6.5) ----------
  // Levels built in M2: 1 listen and follow · 2 read along · 3 read with help. Hints cost stars, never progress.
  function glossOf(token) {
    const k = token.toLowerCase().replace(/[^a-z']/g, '');
    if (!k) return null;
    if (C.gloss && C.gloss[k]) return C.gloss[k];
    const w = ALL_WORDS.find(x => x.en.toLowerCase() === k);
    return w ? (w.he2 ? `${w.he} · ${w.he2}` : w.he) : null;
  }
  const friendCard = (p, gold) => `<div class="fcard ${gold ? 'gold' : ''}"><div class="femoji">${p.friend.emoji}</div><div class="fname en">${esc(p.friend.name)}</div><div class="ffacts en">${p.friend.facts.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>`;
  const friendChip = (p, gold) => `<div class="fchip ${gold ? 'gold' : ''}"><span>${p.friend.emoji}</span><b class="en">${esc(p.friend.name)}</b></div>`;
  const curQ = () => R.st.qs[R.st.qIdx];

  function startStory() {
    const pl = R.plan.story;
    if (!pl) return finishSession();
    const level = clamp(S.story.level, 1, 3);
    R.st = {
      p: pl.p, reread: pl.reread, level, stage: 'pre', qIdx: 0, results: [], taps: 0, audioTaps: 0, heTaps: 0, heShown: {},
      qs: pl.p.questions.filter(q => q.type !== 'he' || level <= 2),      // the Hebrew meaning check is for levels 1–2 only
      kTok: 0, readDone: level > 1, startedAt: 0, gloss: '',
    };
    setPhase('story'); view = 'story'; render();
  }
  function stStartRead() {
    const st = R.st; st.stage = 'read'; st.startedAt = Date.now(); render();
    if (st.level === 1) karaoke(0, ++st.kTok);
  }
  // level 1: the passage is read aloud sentence by sentence, each one lit while it is spoken
  function karaoke(i, tok) {
    const st = R && R.st; if (!st || st.stage !== 'read' || st.kTok !== tok) return;
    document.querySelectorAll('.sline').forEach(el => el.classList.toggle('now', Number(el.dataset.i) === i));
    Audio.speak(st.p.sentences[i].en);
    Audio.afterSpeech(() => {
      if (!R || R.st !== st || st.stage !== 'read' || st.kTok !== tok) return;
      if (i + 1 < st.p.sentences.length) return karaoke(i + 1, tok);
      st.readDone = true; render();
    }, 1400, 8000);
  }
  function stopKaraoke() { const st = R.st; st.kTok++; if (st.stage === 'read' && !st.readDone) { st.readDone = true; const b = document.querySelector('[data-action="st-toq"]'); if (b) b.disabled = false; } }
  function stWord(tok) {
    const st = R.st; stopKaraoke(); st.taps++;
    const clean = tok.replace(/[^A-Za-z']/g, '');
    Audio.speak(clean);
    const he = glossOf(tok);
    st.gloss = he ? `${clean} = ${he}` : clean;
    const el = document.getElementById('sgloss'); if (el) el.textContent = st.gloss;     // no re-render: the page keeps its scroll
  }
  function stSay(i) {
    const st = R.st; stopKaraoke(); st.audioTaps++;
    document.querySelectorAll('.sline').forEach(el => el.classList.toggle('now', Number(el.dataset.i) === i));
    Audio.speak(st.p.sentences[i].en);
  }
  function stHe(i) { const st = R.st; stopKaraoke(); if (!st.heShown[i]) st.heTaps++; st.heShown[i] = !st.heShown[i]; render(); }
  // a Hebrew line he opened while reading would answer the question for him; in the questions, Hebrew comes only through the hint ladder
  function stToQ() { const st = R.st; stopKaraoke(); Audio.stop(); st.heShown = {}; st.stage = 'q'; st.qIdx = 0; openQ(); render(); }
  function openQ() {
    const st = R.st, q = curQ(), L = st.level;
    Object.assign(st, { hint: 0, wrongs: 0, picked: [], off: [], solved: false, revealed: false, gloss: '' });
    if (q.type === 'tf') st.opts = [{ id: 'T', label: L === 1 ? 'נכון' : 'True', ok: q.ok === true }, { id: 'F', label: L === 1 ? 'לא נכון' : 'False', ok: q.ok === false }];
    else {
      const o = q.choices.map((c, i) => ({ id: String(i), label: L === 1 ? c.he : c.en, ok: !!c.ok }));
      st.opts = q.type === 'tick2' ? o : shuffle(o);
    }
  }
  function stRecord() { const st = R.st; st.results.push({ hints: st.hint, wrongs: st.wrongs, star: st.hint === 0 && st.wrongs === 0 }); }
  function stSolved() {
    const st = R.st, at = st.qIdx; st.solved = true; stRecord();
    Audio.ding(st.results.filter(r => r.star).length * 2); render();
    setTimeout(() => { if (R && R.st === st && st.stage === 'q' && st.qIdx === at) stNext(); }, 1300);
  }
  // the hint ladder: 1 light the sentence that holds the answer · 2 show its Hebrew · 3 show the answer
  function stHint() {
    const st = R.st; if (st.solved || st.revealed) return;
    st.hint = Math.min(3, st.hint + 1);
    if (st.hint === 3) { st.revealed = true; stRecord(); }
    st.scrollEv = true; render();
  }
  function stMiss(ids) { const st = R.st; st.off.push(...ids); st.wrongs++; Audio.hm(); stHint(); }
  function stPick(id) {
    const st = R.st, q = curQ(); if (st.solved || st.revealed || st.off.includes(id)) return;
    if (q.type === 'tick2') {
      if (st.picked.includes(id)) st.picked = st.picked.filter(x => x !== id); else if (st.picked.length < 2) st.picked.push(id);
      return render();
    }
    if (st.opts.find(o => o.id === id).ok) return stSolved();
    stMiss([id]);
  }
  function stCheck() {
    const st = R.st; if (st.picked.length < 2 || st.solved || st.revealed) return;
    const bad = st.picked.filter(id => !st.opts.find(o => o.id === id).ok);
    if (!bad.length) return stSolved();
    st.picked = st.picked.filter(id => !bad.includes(id)); stMiss(bad);
  }
  function stNext() {
    const st = R.st;
    if (st.qIdx + 1 < st.qs.length) { st.qIdx++; openQ(); return render(); }
    const p = st.p, total = st.qs.length, stars = st.results.filter(r => r.star).length;
    const seconds = Math.round((Date.now() - st.startedAt) / 1000);
    const prev = S.story.done[p.id];
    const best = !prev || stars / total >= prev.stars / prev.total;
    S.story.done[p.id] = { stars: best ? stars : prev.stars, total: best ? total : prev.total, date: prev ? prev.date : todayStr(), reads: (prev ? prev.reads : 0) + 1 };
    // level-up: three new passages at this level with at most 2 word taps a sentence and 80% of the stars; parent sessions only
    const clean = st.taps / p.sentences.length <= 2 && stars >= Math.ceil(0.8 * total);
    if (R.mode === 'parent' && !st.reread && clean) { S.story.clean++; if (S.story.clean >= 3 && S.story.level < 3) { S.story.level++; S.story.clean = 0; } }
    const run = { pid: p.id, date: todayStr(), n: R.n, level: st.level, reread: st.reread, stars, total, taps: st.taps, audioTaps: st.audioTaps, heTaps: st.heTaps, seconds, hints: st.results.map(r => r.hints), clean };
    S.story.runs.push(run); if (S.story.runs.length > 60) S.story.runs.shift();
    R.stResult = { pid: p.id, reread: st.reread, level: st.level, stars, total, taps: st.taps, seconds };
    logEvent('story', run); save();
    st.first = !prev; st.gold = stars === total; st.stage = 'end'; render();
  }
  function storyView() {
    const st = R.st, p = st.p, L = st.level;
    if (st.stage === 'pre') {
      const keys = p.keys.map(k => ALL_WORDS.find(w => w.en === k)).filter(Boolean);
      return `
        ${topbar(st.reread ? '📖 ביקור חוזר' : '📖 חבר חדש', '')}
        <div class="card center spre">
          <div class="semoji">${p.emoji}</div>
          <div class="en big">${esc(p.title)}</div>
          ${L === 1 ? `<div class="sgist">${esc(p.gist)}</div>` : ''}
          <div class="skeys">${keys.map(w => `<button class="skey" data-action="speak" data-text="${esc(w.en)}"><span class="en">${esc(w.en)}</span><span>${esc(w.he)}</span></button>`).join('')}</div>
          <div class="bigcta"><button class="btn primary block" data-action="st-read">לסיפור ←</button></div>
        </div>`;
    }
    if (st.stage === 'end') {
      onRendered(() => { Audio.fanfare(); if (st.gold) confetti(60); });
      return `
        ${topbar(st.first ? 'חבר חדש באוסף!' : 'ביקור מוצלח', '')}
        <div class="card center">
          <div class="sstars big">${st.results.map(r => r.star ? '⭐' : '☆').join(' ')}</div>
          ${friendCard(p, st.gold)}
          ${st.gold ? '<div class="muted">קלף זהב. כל הכוכבים.</div>' : ''}
          <div class="bigcta"><button class="btn primary block" data-action="st-done">המשך ←</button></div>
        </div>`;
    }
    const inQ = st.stage === 'q'; const q = inQ ? curQ() : null;
    const words = s => s.split(' ').map(t => `<span class="w" data-action="st-word" data-w="${esc(t)}">${esc(t)}</span>`).join(' ');
    const line = i => {
      const s = p.sentences[i]; const ev = inQ && st.hint >= 1 && q.ev.includes(i);
      return `<div class="sline ${ev ? 'ev' : ''}" data-i="${i}">
          ${L <= 2 ? `<button class="sbtn" data-action="st-say" data-i="${i}">🔊</button>` : ''}
          <span class="stext en">${words(s.en)}</span>
          ${L === 1 && !inQ ? `<button class="sbtn q" data-action="st-he" data-i="${i}">?</button>` : ''}
          ${st.heShown[i] || (ev && st.hint >= 2) ? `<div class="she">${esc(s.he)}</div>` : ''}
        </div>`;
    };
    const passage = `<div class="card passage">${p.paras.map(par => `<div class="spara">${par.map(line).join('')}</div>`).join('')}<div class="sgloss" id="sgloss" dir="ltr">${st.gloss ? esc(st.gloss) : '&nbsp;'}</div></div>`;
    if (!inQ) return `
        ${topbar(`${p.emoji} <span class="en">${esc(p.title)}</span>`, L === 1 ? 'מקשיבים ועוקבים. אפשר לגעת בכל מילה.' : 'אפשר לגעת בכל מילה.')}
        ${passage}
        <div class="bigcta"><button class="btn primary block" data-action="st-toq" ${st.readDone ? '' : 'disabled'}>לשאלות ←</button></div>`;
    if (st.scrollEv) { st.scrollEv = false; onRendered(() => { const el = document.querySelector('.sline.ev'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); }
    const done = st.solved || st.revealed; const en = L > 1;
    const qtext = q.type === 'tf'
      ? `<div class="qlabel ${L === 3 ? 'en' : ''}">${L === 3 ? 'True or false?' : 'נכון או לא נכון?'}</div><div class="qstmt en">${words(q.en)}</div>${L === 1 ? `<div class="she">${esc(q.he)}</div>` : ''}`
      : (L === 3 && q.en ? `<div class="qstmt en">${words(q.en)}</div>` : `<div class="qhe">${esc(q.he)}</div>`);
    const opts = st.opts.map(o => {
      const cls = done && o.ok ? 'good' : (st.off.includes(o.id) || (done && !o.ok) ? 'off' : (st.picked.includes(o.id) ? 'picked' : ''));
      return `<button class="qopt ${en ? 'en' : ''} ${cls}" data-action="st-pick" data-id="${o.id}" ${done || st.off.includes(o.id) ? 'disabled' : ''}>${esc(o.label)}</button>`;
    }).join('');
    const stars = st.qs.map((_, i) => i < st.results.length ? (st.results[i].star ? '⭐' : '☆') : '<span class="dot">•</span>').join('');
    return `
        ${topbar(`${p.emoji} <span class="en">${esc(p.title)}</span>`, `שאלה ${st.qIdx + 1} מתוך ${st.qs.length}`, `<span class="sstars">${stars}</span>`)}
        ${passage}
        <div class="card qcard">
          ${qtext}
          <div class="qopts ${q.type === 'tick2' ? 'col' : ''} ${en ? 'ltr' : ''}">${opts}</div>
          <div class="row wrap" style="justify-content:center; margin-top:12px">
            ${q.type === 'tick2' && !done ? `<button class="btn primary" data-action="st-check" ${st.picked.length === 2 ? '' : 'disabled'}>בדיקה</button>` : ''}
            ${!done ? `<button class="btn small" data-action="st-hint">💡 רמז</button>` : ''}
            ${st.revealed ? `<button class="btn primary" data-action="st-next">הלאה ←</button>` : ''}
          </div>
        </div>`;
  }

  // ---------- rendering ----------
  function render() {
    document.body.dataset.skin = (S.hero && S.hero.skin) || window.__skinSel || 'wizard';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = { wizard: '#1a1438', space: '#071022', map: '#e9dcb9' }[document.body.dataset.skin] || '#1a1438';
    const fn = VIEWS[view] || VIEWS.map;
    $app.innerHTML = fn();
    afterRender();
  }
  let afterRenderHooks = [];
  function afterRender() { const hs = afterRenderHooks; afterRenderHooks = []; hs.forEach(h => h()); }
  const onRendered = h => afterRenderHooks.push(h);

  // Catmull-Rom through points -> cubic Bezier path (viewBox units)
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  function topbar(title, sub, right) {
    return `<div class="topbar"><div><div class="title">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="row">${right || ''}</div></div>`;
  }

  const VIEWS = {
    onboarding() {
      const sel = window.__skinSel || null; // nothing preselected: the choice is his
      return `
        <div class="topbar"><div><div class="title">50 מילים. שבועיים. בוס אחד.</div><div class="sub">המילים עוד לא יודעות מה מחכה להן.</div></div></div>
        <div class="card">
          <p><b>איפה זה יקרה?</b></p>
          <div class="skins">
            ${Object.values(C.skins).map(s => `
              <button class="btn skin ${sel === s.id ? 'selected' : ''}" data-action="pick-skin" data-skin="${s.id}">
                <span class="icon">${s.icon}</span>
                <span><b>${s.name}</b><br><span class="muted" style="font-size:16px">${esc(s.blurb)}</span></span>
              </button>`).join('')}
          </div>
          <p style="margin-top:20px"><b>איך יקראו לך בספרי ההיסטוריה?</b></p>
          <input class="text" id="heroName" maxlength="16" placeholder="שם הגיבור" value="${esc(window.__heroName || '')}">
          <div class="bigcta"><button class="btn primary block" data-action="finish-onboarding">יוצאים לדרך</button></div>
        </div>`;
    },

    map() {
      const sk = skin(); const done = todayDone(); const bc = boxCounts();
      const capLeft = Math.max(0, S.settings.freePlayCapMin - Math.floor(today().freePlaySec / 60));
      const hasCards = Object.keys(S.cards).length > 0;
      const st = streak();
      const nextLand = C.lands.find(l => !landIntroduced(l.id));
      const dueCount = hasCards ? buildReviewQueue(S.sessionCount + 1).length : 0;

      // stops along the trail, bottom-right to top
      const L = Object.fromEntries(C.lands.map(l => [l.id, l]));
      const stops = [
        { kind: 'land', land: L[0], x: 86, y: 96 }, { kind: 'land', land: L[1], x: 62, y: 91 },
        { kind: 'land', land: L[2], x: 36, y: 86 }, { kind: 'land', land: L[3], x: 14, y: 76 },
        { kind: 'tower', g: C.grammar[0], x: 24, y: 62 }, { kind: 'land', land: L[4], x: 50, y: 57 },
        { kind: 'tower', g: C.grammar[1], x: 76, y: 52 }, { kind: 'land', land: L[5], x: 84, y: 37 },
        { kind: 'tower', g: C.grammar[2], x: 56, y: 30 }, { kind: 'tower', g: C.grammar[3], x: 28, y: 23 },
        { kind: 'boss', x: 52, y: 7 },
      ].filter(s => s.kind !== 'land' || s.land);
      const node = s => {
        if (s.kind === 'land') {
          const intro = landIntroduced(s.land.id); const p = landProgress(s.land);
          const isCurrent = !done && ((!intro && nextLand && nextLand.id === s.land.id) || (intro && p.pct < 100 && !nextLand));
          const cls = !intro ? 'locked' : (p.pct === 100 ? 'done' : '');
          return `<div class="node ${cls} ${isCurrent ? 'current' : ''} ${s.land.starter ? 'starter' : ''}" style="left:${s.x}%; top:${s.y}%">
            <div class="dot">${intro ? landIcon(s.land) : '🔒'}${p.pct === 100 ? '<span class="flag">🚩</span>' : ''}</div>
            <div class="label">${landName(s.land)}</div>
            <div class="stat">${intro ? `${p.mastered}/${p.total}` : `${s.land.words.length} מילים`}</div>
          </div>`;
        }
        if (s.kind === 'tower') {
          const p = towerProgress(s.g);
          const cls = !p.open ? 'locked' : (p.pct === 100 ? 'done' : '');
          return `<div class="node ${cls}" style="left:${s.x}%; top:${s.y}%"><div class="dot">${p.open ? sk.towerIcon : '🔒'}${p.open && p.pct === 100 ? '<span class="flag">🚩</span>' : ''}</div><div class="label">${sk.tower}</div><div class="stat en" style="letter-spacing:0">${p.open ? `${p.mastered}/${p.total}` : esc(s.g.short)}</div></div>`;
        }
        return `<div class="node locked boss" style="left:${s.x}%; top:${s.y}%"><div class="dot">${sk.bossIcon}</div><div class="label">${sk.boss}</div><div class="stat">עוד לא פתוח</div></div>`;
      };
      const road = smoothPath(stops.map(s => [s.x, s.y]));
      const nl = nextLandForToday();
      const questLead = done ? 'זהו להיום. המפה סגורה.' : (hasCards ? 'המילים של היום מחכות.' : 'הציוד שלך מחכה.');
      const newFriend = STORIES.some(x => !S.story.done[x.id]) && landIn(2, nl);
      const questParts = [dueCount ? `${dueCount} קלפים שבטוחים ששכחת אותם` : '', nl ? (nl.starter ? sk.starterNew : `${sk.newTerritory} לכבוש`) : '', newFriend ? 'חבר חדש להכיר' : ''].filter(Boolean);
      const questSub = done ? 'יש לה יום גדול מחר.' : questParts.join(' · ');
      const friends = Object.entries(S.story.done).filter(([pid]) => STORY[pid]);
      return `
        <div class="topbar">
          <div class="hero" id="heroTap"><div class="avatar">${sk.icon}</div><div><div class="name">${esc(S.hero.name)}</div><div class="sub">${sk.hero} · ${sk.name}</div></div></div>
          <div class="row"><span class="pill">🔥 ${st}</span><span class="pill accent" id="coachTap">⭐ ${masteredWordCount()}/50</span></div>
        </div>
        <div class="card quest">
          <div><div class="lead">${questLead}</div><div class="muted">${questSub}</div></div>
          ${done
            ? `<button class="btn ${capLeft > 0 ? 'primary' : ''}" data-action="practice" ${capLeft > 0 ? '' : 'disabled'}>🏋️ מגרש האימונים${capLeft > 0 ? ` · ${capLeft} דק׳` : ' · סגור'}</button>`
            : `<button class="btn primary" data-action="start">▶ למשימה</button>`}
        </div>
        <div class="trail">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"><path class="road-glow" d="${road}"/><path class="road" d="${road}"/></svg>
          ${stops.map(node).join('')}
        </div>
        <div class="ranks">${[1, 2, 3, 4, 5].map(b => `<div class="rank"><b>${bc[b]}</b><span>${sk.boxNames[b - 1]}</span></div>`).join('')}</div>
        ${friends.length ? `<div class="friends">${friends.map(([pid, d]) => friendChip(STORY[pid], d.stars === d.total)).join('')}</div>` : ''}`;
    },

    modepick() {
      return `
        ${topbar('מי איתך עכשיו?', 'זה משנה מה יהיה במשימה')}
        <div class="card" style="display:flex; flex-direction:column; gap:14px">
          <button class="btn primary block" style="min-height:90px" data-action="mode" data-mode="parent">👨‍👩‍👦 עם אבא או אמא</button>
          <button class="btn block" style="min-height:90px" data-action="mode" data-mode="solo">🧑 לבד</button>
          <button class="btn ghost small" data-action="to-map">חזרה</button>
        </div>`;
    },

    mission() {
      const sk = skin(); const items = [];
      if (R.reviewTotal) items.push(`🔁 ${R.reviewTotal} קלפים לחזרה`);
      if (R.newLand) items.push(`${landIcon(R.newLand)} ${landNewLabel(R.newLand)}: ${landName(R.newLand)} (${R.newLand.words.length} מילים)`);
      const pl = R.plan;
      if (pl.unit) items.push(`${sk.towerIcon} ${sk.tower}: <span class="en">${esc(pl.unit.title)}</span>`);
      if (pl.sd) items.push('🔀 <span class="en">same</span> או <span class="en">different</span>?');
      if (pl.writing) items.push(pl.writing.paper ? '✍️ שני משפטים. להכין עט ודף!' : '🧩 שני משפטים לבנות');
      if (pl.story) items.push(pl.story.reread ? `📖 ביקור חוזר אצל <span class="en">${esc(pl.story.p.friend.name)}</span>` : '📖 חבר חדש מחכה בסוף');
      if (R.mode === 'solo') items.push('🔢 בסוף תקבל קוד להראות להורים');
      return `
        ${topbar('המשימה של היום', `משימה מספר ${R.n}`)}
        <div class="card">
          <ul style="font-size:22px; line-height:2">${items.map(x => `<li>${x}</li>`).join('')}</ul>
          <div class="bigcta"><button class="btn primary block" data-action="go">יאללה!</button></div>
        </div>`;
    },

    card() { return cardScreen(R, false); },
    practice() { return cardScreen(P, true); },

    // one screen with the rule, before a grammar unit's first cards
    pintro() {
      const sk = skin(); const u = R.pack.unit;
      return `
        ${topbar(`${sk.towerIcon} ${sk.tower}`, 'כלל אחד קטן, ואז מנסים', '')}
        <div class="card rule">
          <div class="en big">${esc(u.title)}</div>
          <ul class="rulelines">${u.rule.map(l => `<li>${l}</li>`).join('')}</ul>
          ${u.trick ? `<div class="trick">💡 ${esc(u.trick)}</div>` : ''}
          <div class="examples">${u.examples.map(x => `<button class="exline en" data-action="speak" data-text="${esc(x)}">🔊 ${esc(x)}</button>`).join('')}</div>
          <div class="bigcta"><button class="btn primary block" data-action="pack-go">בואו ננסה</button></div>
        </div>`;
    },

    writing() { return writingView(); },
    story() { return storyView(); },

    intro() {
      const sk = skin(); const land = R.newLand; const wid = land.words[R.introIdx]; const w = WORDS[wid];
      onRendered(() => { if (S.settings.autoSpeak) Audio.speak(w.en); });
      return `
        ${topbar(landName(land), `מילה ${R.introIdx + 1} מתוך ${land.words.length}`, `<button class="btn small ghost" data-action="skip-intro">דלג על ההיכרות</button>`)}
        <div class="progress"><div style="width:${Math.round(100 * R.introIdx / land.words.length)}%"></div></div>
        <div class="card intro">
          ${w.emoji ? `<div class="emoji">${w.emoji}</div>` : ''}
          <div class="en big">${esc(w.en)}</div>
          ${w.chunks !== w.en ? `<div class="chunks en">${esc(w.chunks)}</div>` : ''}
          <div class="he big">${esc(w.he)}</div>
          ${w.he2 ? `<div class="muted">${esc(w.he2)}</div>` : ''}
          <div class="muted" style="font-size:18px; margin-top:6px">💡 ${esc(w.tip)}</div>
          <div class="row" style="margin-top:16px">
            <button class="btn speak" data-action="speak" data-text="${esc(w.en)}">🔊</button>
            <button class="btn primary" style="min-width:180px" data-action="intro-next">${R.introIdx + 1 < land.words.length ? 'הבא ←' : 'בואו נתרגל!'}</button>
          </div>
        </div>`;
    },

    close() {
      const sk = skin(); const rec = today().session; const bc = boxCounts();
      onRendered(() => { Audio.fanfare(); if (rec.mastered) confetti(90); });
      return `
        ${topbar(rec.hardStop ? 'הזמן נגמר להיום, יופי של עבודה!' : 'המשימה הושלמה! 🎉', `משימה ${rec.n} · ${minutes(rec.durationMs)} דקות`)}
        <div class="stats">
          <div class="card stat"><div class="num" data-count="${rec.correct}">0</div><div class="lbl">תשובות נכונות</div></div>
          <div class="card stat"><div class="num" data-count="${rec.promoted}">0</div><div class="lbl">קלפים שעלו קופסה</div></div>
          <div class="card stat"><div class="num" data-count="${masteredWordCount()}">0</div><div class="lbl">מילים שנכבשו</div></div>
        </div>
        ${rec.maxCombo >= 5 ? `<div class="card center">🔥 רצף הכי ארוך: <b>${rec.maxCombo}</b> ברצף!</div>` : ''}
        ${rec.story && STORY[rec.story.pid] ? `<div class="card center" style="margin-top:12px"><div class="muted">${rec.story.reread ? 'ביקרת היום אצל' : 'חבר חדש באוסף'}</div>${friendCard(STORY[rec.story.pid], rec.story.stars === rec.story.total)}</div>` : ''}
        ${rec.writing && rec.writing.items.length ? `<div class="card center" style="margin-top:12px">✍️ ${rec.writing.items.length === 1 ? 'משפט אחד' : `${rec.writing.items.length} משפטים`} באנגלית, ${rec.writing.items.some(x => x.paper) ? 'בכתב יד' : 'מילה אחרי מילה'}.</div>` : ''}
        ${rec.mode === 'solo' ? `<div class="card" style="margin-top:12px"><div class="center muted">הקוד. להראות להורים, לא ל${sk.boss.replace(/^ה/, '')}.</div><div class="code">${rec.code}</div></div>` : ''}
        <div class="ranks">${[1, 2, 3, 4, 5].map(b => `<div class="rank"><b>${bc[b]}</b><span>${sk.boxNames[b - 1]}</span></div>`).join('')}</div>
        <div class="bigcta"><button class="btn primary block" data-action="to-map">למפה</button></div>`;
    },

    coach() { return coachScreen(); },
  };

  function cardScreen(rt, practice) {
    const item = rt.current; const v = item.view; const w = v.prompt; const g = v.g;
    const total = practice ? null : R.round.total;
    const progress = practice ? 0 : clamp(Math.round(100 * rt.done / Math.max(1, total)), 0, 100);
    const st = S.cards[item.cid];
    const header = practice
      ? topbar('🏋️ מגרש האימונים', '', `<button class="btn small" data-action="end-practice">סיום</button>`)
      : topbar(R.round.title, `${Math.min(rt.done, total)}/${total}${item.retry ? ' · 🔁' : ''}`, `<span class="combo ${rt.combo >= 5 ? 'hot' : ''}">${rt.combo >= 2 ? `x${rt.combo}` : ''}</span>`);
    const ladder = `<div class="boxladder" title="קופסה">${[1, 2, 3, 4, 5].map(b => `<span class="${b <= st.box ? (b === 5 ? 'top' : 'on') : ''}"></span>`).join('')}</div>`;

    let prompt = '', options = '', optCls = '';
    const optBtn = (o, label, cls) => `<button class="opt ${cls}" data-action="answer" data-id="${esc(o.id)}">${label}</button>`;
    if (v.kind === 'gc') {
      // grammar cloze: no audio before the answer (it would give the answer away); the whole sentence is spoken after
      const [a, b] = g.t.split('___');
      prompt = `<div class="muted">מה חסר?</div><div class="en mid cloze">${esc(a)}<span class="blank" id="blank">&nbsp;</span>${esc(b)}</div>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join(''); optCls = v.options.length === 3 ? 'ltr three' : 'ltr';
    } else if (v.kind === 'np') {
      onRendered(() => { if (S.settings.autoSpeak) Audio.speak(g.en); });
      prompt = `<div class="muted">איזו מילה קטנה באה במקום?</div><div class="en big">${esc(g.en)}</div>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join(''); optCls = 'ltr';
    } else if (v.kind === 'sd') {
      prompt = g.pic ? `<div class="sdpic">${g.pic.map(e => `<span>${e}</span>`).join('')}</div>` : `<div class="sdlines en">${g.lines.map(l => `<div>${esc(l)}</div>`).join('')}</div>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join(''); optCls = 'ltr';
    } else if (v.kind === 'rec') {
      onRendered(() => { if (S.settings.autoSpeak) Audio.speak(w.en); });
      prompt = `<div class="muted">מה זה אומר?</div><div class="en big">${esc(w.en)}</div><button class="btn speak" data-action="speak" data-text="${esc(w.en)}">🔊</button>`;
      options = v.options.map(o => optBtn(o, esc(o.he), 'he')).join('');
    } else if (v.kind === 'lineup') {
      onRendered(() => Audio.speak(w.en));
      prompt = `<div class="muted">איזו מילה שמעת?</div><button class="btn speak" style="width:96px;height:96px;font-size:48px" data-action="speak" data-text="${esc(w.en)}">🔊</button>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join('');
    } else if (v.kind === 'img') {
      onRendered(() => { if (S.settings.autoSpeak) Audio.speak(w.en); });
      prompt = `<div class="muted">איזו תמונה מתאימה?</div><div class="en big">${esc(w.en)}</div><button class="btn speak" data-action="speak" data-text="${esc(w.en)}">🔊</button>`;
      options = v.options.map(o => optBtn(o, o.emoji, 'emoji')).join('');
    } else {
      prompt = `<div class="muted">איזו מילה מתאימה לתמונה?</div><div style="font-size:96px; line-height:1.1">${w.emoji}</div>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join('');
    }
    return `
      ${header}
      ${practice ? '' : `<div class="progress"><div style="width:${progress}%"></div></div>`}
      <div class="card question" style="margin-top:14px">${prompt}<div style="position:absolute; top:14px; left:16px">${ladder}</div></div>
      <div class="options ${optCls}" id="options">${options}</div>
      <div id="feedback"></div>`;
  }

  // what a miss on a grammar-type card shows: the whole answer, its Hebrew, and the one-line reason
  function gMissHtml(g) {
    if (g.kind === 'gc') { const [a, b] = g.t.split('___'); return `<div class="en mid">${esc(a)}<b class="ans">${esc(g.a)}</b>${esc(b)}</div><div class="he mid">${esc(g.he)}</div><div class="tip en center">💡 ${esc(g.tip)}</div>`; }
    if (g.kind === 'np') return `<div class="en mid">${esc(g.en)} = <b class="ans">${esc(g.a)}</b></div><div class="he mid">${esc(g.he)}</div>`;
    return `<div class="en mid"><b class="ans">same</b> = <span class="he">אותו הדבר</span></div><div class="en mid"><b class="ans">different</b> = <span class="he">שונה</span></div>`;
  }

  function handleAnswer(id) {
    const rt = P || R; if (!rt || !rt.current || rt.current.answered) return;
    const item = rt.current; const v = item.view; const w = v.prompt; const g = v.g; const correct = id === v.answerId;
    item.answered = true;
    const practice = !!P;
    const prevBox = S.cards[item.cid].box;
    applyAnswer(item, correct, practice);
    if (!practice) R.done++;
    const st = S.cards[item.cid];
    const say = v.say || w.en;
    const $blank = document.getElementById('blank');
    if ($blank) { $blank.textContent = v.answerId; $blank.classList.add('filled'); }
    const $opts = document.getElementById('options');
    $opts.querySelectorAll('.opt').forEach(b => {
      if (b.dataset.id === v.answerId) b.classList.add('good');
      else if (b.dataset.id === id) b.classList.add('miss');
      else b.classList.add('dim');
      b.disabled = true;
    });
    const $fb = document.getElementById('feedback');
    if (correct) {
      Audio.ding(rt.combo);
      Audio.speak(say);
      const promoted = !practice && !item.retry && st.box > prevBox;
      const mastered = promoted && st.box === 5;
      if (promoted) {
        // felt, not read: the ladder square lights up with the whoosh
        const sq = document.querySelectorAll('.boxladder span')[st.box - 1];
        if (sq) { sq.classList.add(mastered ? 'top' : 'on', 'pop'); }
        setTimeout(() => Audio.whoosh(), 200);
        if (mastered) { confetti(); Audio.fanfare(); }
      }
      const milestone = rt.combo >= 5 && rt.combo % 5 === 0;
      $fb.innerHTML = `<div class="feedback good">
        <span class="bigmark">✓</span>
        ${v.kind === 'lineup' ? `<span class="he big">${esc(w.he)}</span>` : ''}
        ${g && g.he ? `<span class="he mid">${esc(g.he)}</span>` : ''}
        ${milestone ? `<span class="combo-big">x${rt.combo} 🔥</span>` : ''}
        ${mastered ? `<span class="he big">נכבש! 🏆</span>` : ''}
      </div>`;
      if (milestone) document.body.classList.add('flash'), setTimeout(() => document.body.classList.remove('flash'), 500);
      // move on when the word has finished being spoken (capped), so the next card never cuts it off;
      // the lineup and grammar cards show the meaning too, so they linger a little longer
      const lingerMin = mastered ? 2200 : (v.kind === 'lineup' || g ? 1500 : 900);
      const lingerMax = v.kind === 'gc' ? 3400 : (v.kind === 'lineup' || g ? 2300 : 1700);
      Audio.afterSpeech(() => practice ? nextPracticeCard() : nextCard(), lingerMin, lingerMax);
    } else {
      Audio.hm();
      setTimeout(() => Audio.speak(say), 350);
      const demoted = !practice && !item.retry && st.box < prevBox;
      // the ladder square going dark + the thud carry the demotion; no sentence needed
      if (demoted) { Audio.thud(); const sq = document.querySelectorAll('.boxladder span')[prevBox - 1]; if (sq) sq.classList.remove('on', 'top'); }
      $fb.innerHTML = `<div class="feedback miss">
        ${g ? gMissHtml(g) : `<div class="row" style="justify-content:center; gap:18px"><span class="en mid">${esc(w.en)}</span><span class="he big">${esc(w.he)}</span></div>
        ${w.chunks !== w.en ? `<div class="chunks en center">${esc(w.chunks)}</div>` : ''}
        <div class="tip center">💡 ${esc(w.tip)}</div>`}
        <button class="btn primary" style="margin-top:10px" data-action="continue">הלאה</button>
      </div>`;
    }
  }

  function coachScreen() {
    const sk = skin(); const bc = boxCounts(); const d = today();
    const sessions = Object.entries(S.days).filter(([, v]) => v.session).sort((a, b) => a[0] < b[0] ? 1 : -1);
    const tricky = Object.entries(S.cards).filter(([, st]) => st.misses >= 3).sort((a, b) => b[1].misses - a[1].misses).slice(0, 12);
    const lands = S.landsIntroduced.map(l => `${landName(C.lands.find(x => x.id === l.id) || { id: l.id })} (${l.date})`).join(', ') || 'עדיין לא';
    // M2: per-step log, grammar towers, writing track, story track
    const wr = S.writing, sto = S.story;
    const PHASE_HE = { review: 'חזרה', intro: 'היכרות', new: 'מילים חדשות', pintro: 'כלל', pack: 'דקדוק', writing: 'כתיבה', story: 'סיפור' };
    const RUNG_HE = { 1: 'בנייה באריחים', 2: 'בנייה עם אות גדולה ונקודה', 3: 'בנייה ואז העתקה לדף', 4: 'כתיבה על דף מתמונה ובנק מילים' };
    const LEVEL_HE = { 1: 'מקשיב ועוקב', 2: 'קורא עם הקראה לפי בקשה', 3: 'קורא עם עזרה במילים' };
    const mmss = s => `${Math.floor(s / 60)}:${pad2(s % 60)}`;
    const steps = d.session && d.session.secs ? Object.entries(d.session.secs).filter(([k]) => PHASE_HE[k]).map(([k, s]) => `${PHASE_HE[k]} ${mmss(s)}`).join(' · ') : '';
    const towers = `<div class="boxes">${C.grammar.map(g => { const p = towerProgress(g); return `<div><b>${p.open ? `${p.mastered}/${p.total}` : '🔒'}</b><span class="en" style="letter-spacing:0">${esc(g.short)}</span></div>`; }).join('')}</div>`;
    const wMark = r => `${r.tiles === null ? '' : (r.tiles ? 'אריחים ✓' : 'אריחים, עם תיקון')}${r.tiles !== null && r.paper ? ' · ' : ''}${r.paper ? (r.paper === 'ok' ? 'דף ✓' : 'דף 🔁') : ''}`;
    const wRows = wr.history.slice(-6).reverse().map(h => h.items.map((r, i) => `<tr>${i === 0 ? `<td rowspan="${h.items.length}">${h.date}<br>${h.mode === 'solo' ? 'לבד' : 'הורה'}</td>` : ''}<td class="en">${esc(r.model)}</td><td>${r.rung}</td><td>${wMark(r)}</td></tr>`).join('')).join('');
    const sRows = sto.runs.slice(-8).reverse().map(r => `<tr><td>${r.date}</td><td class="en">${esc(r.pid)}${r.reread ? ' ↺' : ''}</td><td>${r.level}</td><td><bdi>${r.stars}/${r.total}</bdi></td><td>${(r.taps / ((STORY[r.pid] || { sentences: [1] }).sentences.length)).toFixed(1)}</td><td>${mmss(r.seconds)}</td><td>${Math.max(0, ...r.hints)}</td></tr>`).join('');
    const m2 = `
        <h3>דקדוק (שולט / קלפים)</h3>
        <div>${towers}</div>
        <h3>כתיבה · שלב ${wr.rung}: ${RUNG_HE[wr.rung] || ''} · מפגשים נקיים ${wr.clean}/3</h3>
        <div class="row wrap"><button class="btn small" data-action="writing-rung" data-d="-1">שלב אחד למטה</button><button class="btn small" data-action="writing-rung" data-d="1">שלב אחד למעלה</button></div>
        ${wRows ? `<table><tr><th>מתי</th><th>משפט</th><th>שלב</th><th>תוצאה</th></tr>${wRows}</table>` : '<div class="muted">עוד לא התחיל</div>'}
        ${wr.again.length ? `<div>חוזרים במפגש הבא: <span class="en">${wr.again.map(s => esc(wItem(s).model)).join(' ')}</span></div>` : ''}
        <div class="muted">ביום הראשון עם עט: להראות פעם אחת את h (מקל גבוה) ואת a (בלי זנב). אחר כך רק הסעיף השלישי בבדיקה. לא להעיר על זה מעבר לכך.</div>
        <h3>סיפורים · רמת תמיכה ${sto.level}: ${LEVEL_HE[sto.level] || ''} · נקיים ${sto.clean}/3</h3>
        <div class="row wrap"><button class="btn small" data-action="story-level" data-d="-1">יותר תמיכה</button><button class="btn small" data-action="story-level" data-d="1">פחות תמיכה</button></div>
        ${sRows ? `<table><tr><th>מתי</th><th>סיפור</th><th>רמה</th><th>כוכבים</th><th>נגיעות למשפט</th><th>זמן</th><th>רמז מרבי</th></tr>${sRows}</table>` : '<div class="muted">עוד לא התחיל</div>'}`;
    return `
      ${topbar('מסך המאמן', 'להורים בלבד', `<button class="btn small" data-action="to-map">סגור</button>`)}
      <div class="card coach">
        <h3>הקופסאות (כל הקלפים: ${Object.keys(S.cards).length})</h3>
        <div class="boxes">${[1, 2, 3, 4, 5].map(b => `<div><b>${bc[b]}</b>${b}· ${sk.boxNames[b - 1]}</div>`).join('')}</div>
        <h3>היום (${todayStr()})</h3>
        ${d.session ? `<div>משימה ${d.session.n} · ${d.session.mode === 'solo' ? 'לבד' : 'עם הורה'} · ${minutes(d.session.durationMs)} דק׳ · נכון ${d.session.correct} / טעויות ${d.session.wrong} · עלו ${d.session.promoted} / ירדו ${d.session.demoted}${d.session.hardStop ? ' · נעצר בזמן' : ''}${d.session.mode === 'solo' ? ` · <b>קוד: ${d.session.code}</b>` : ''}${d.session.mode === 'solo' && minutes(d.session.durationMs) < 4 && d.session.correct > 15 ? ' · ⚠️ מהר מדי?' : ''}</div>` : '<div class="muted">עדיין לא הייתה משימה היום</div>'}
        ${steps ? `<div>לפי שלבים: ${steps}</div>` : ''}
        <div>מגרש האימונים היום: ${Math.floor(d.freePlaySec / 60)} דק׳ מתוך ${S.settings.freePlayCapMin}</div>
        <div>${sk.territoriesLabel} שנפתחו: ${lands}</div>
        ${m2}
        <h3>קלפים קשים (3+ טעויות)</h3>
        ${tricky.length ? `<table><tr><th>קלף</th><th>סוג</th><th>טעויות</th><th>קופסה</th></tr>${tricky.map(([cid, st]) => { const p = parseCard(cid); return `<tr><td class="en">${esc(cardLabel(cid))}</td><td>${{ rec: 'משמעות', lineup: 'שמיעה→קריאה', img: 'תמונה', gc: 'דקדוק', np: 'כינוי גוף', sd: 'same / different' }[p.type] || p.type}</td><td>${st.misses}</td><td>${st.box}</td></tr>`; }).join('')}</table>` : '<div class="muted">אין עדיין</div>'}
        <h3>היסטוריה</h3>
        ${sessions.length ? `<table><tr><th>תאריך</th><th>#</th><th>מצב</th><th>נכון/טעות</th><th>עלו/ירדו</th><th>דק׳</th><th>קוד</th></tr>${sessions.map(([date, v]) => `<tr><td>${date}</td><td>${v.session.n}</td><td>${v.session.mode === 'solo' ? 'לבד' : 'הורה'}</td><td><bdi>${v.session.correct}</bdi>/<bdi>${v.session.wrong}</bdi></td><td><bdi>${v.session.promoted}</bdi>/<bdi>${v.session.demoted}</bdi></td><td>${minutes(v.session.durationMs)}</td><td class="en">${v.session.mode === 'solo' ? v.session.code : ''}</td></tr>`).join('')}</table>` : '<div class="muted">אין עדיין</div>'}
        <h3>הגדרות</h3>
        <div class="row wrap">
          <label>מגרש האימונים, דקות ביום: <input class="text" style="width:90px; font-size:18px; padding:6px 10px" type="number" min="0" max="60" id="capInput" value="${S.settings.freePlayCapMin}"></label>
          <button class="btn small" data-action="save-cap">שמור</button>
          <button class="btn small" data-action="toggle-speak">הקראה אוטומטית: ${S.settings.autoSpeak ? 'פועלת' : 'כבויה'}</button>
          <button class="btn small" data-action="change-pin">שינוי קוד מאמן</button>
        </div>
        <h3>גיבוי</h3>
        <div class="row wrap">
          <button class="btn small" data-action="export">⬇️ ייצוא שמירה</button>
          <button class="btn small" data-action="import-show">⬆️ ייבוא שמירה</button>
          <button class="btn small" data-action="reset-today">איפוס המשימה של היום</button>
          <button class="btn small" data-action="reset-all" style="border-color:#c47b3a">איפוס מלא</button>
        </div>
        <div id="importBox" class="hidden" style="margin-top:10px"><textarea class="json" id="importText" placeholder="הדבק כאן את קובץ השמירה"></textarea><button class="btn small" data-action="import">ייבא</button></div>
      </div>`;
  }

  // ---------- actions ----------
  $app.addEventListener('click', e => {
    const a = e.target.closest('[data-action]'); if (!a) return;
    const act = a.dataset.action;
    switch (act) {
      case 'pick-skin': window.__skinSel = a.dataset.skin; window.__heroName = (document.getElementById('heroName') || {}).value || ''; Audio.whoosh(); render(); break;
      case 'finish-onboarding': {
        const name = ((document.getElementById('heroName') || {}).value || '').trim();
        if (!window.__skinSel) { toast('קודם בוחרים עולם'); return; }
        if (!name) { toast('ולגיבור צריך שם'); return; }
        S.hero = { name, skin: window.__skinSel, createdAt: Date.now() }; save(); logEvent('onboard', { skin: S.hero.skin });
        view = 'map'; render(); break;
      }
      case 'start': view = 'modepick'; render(); break;
      case 'mode': startSession(a.dataset.mode); break;
      case 'go': nextCard(); break;
      case 'speak': Audio.speak(a.dataset.text); break;
      case 'answer': handleAnswer(a.dataset.id); break;
      case 'continue': P ? nextPracticeCard() : nextCard(); break;
      case 'intro-next': {
        R.introIdx++;
        if (R.introIdx >= R.newLand.words.length) startNewRound(); else render();
        break;
      }
      case 'skip-intro': startNewRound(); break;
      case 'pack-go': beginPackRound(); break;
      case 'w-tile': wPlace(a.dataset.id); break;
      case 'w-slot': wUnplace(Number(a.dataset.i)); break;
      case 'w-built': wAfterBuild(); break;
      case 'w-pendown': R.w.stage = 'check'; render(); break;
      case 'w-ok': R.w.res.paper = 'ok'; Audio.ding(4); wDone(); break;
      case 'w-again': R.w.res.paper = 'again'; wDone(); break;
      case 'st-read': stStartRead(); break;
      case 'st-word': stWord(a.dataset.w); break;
      case 'st-say': stSay(Number(a.dataset.i)); break;
      case 'st-he': stHe(Number(a.dataset.i)); break;
      case 'st-toq': stToQ(); break;
      case 'st-pick': stPick(a.dataset.id); break;
      case 'st-check': stCheck(); break;
      case 'st-hint': stHint(); break;
      case 'st-next': stNext(); break;
      case 'st-done': R.st = null; finishSession(); break;
      case 'story-level': S.story.level = clamp(S.story.level + Number(a.dataset.d), 1, 3); S.story.clean = 0; save(); render(); break;
      case 'writing-rung': S.writing.rung = clamp(S.writing.rung + Number(a.dataset.d), 1, 4); S.writing.clean = 0; save(); render(); break;
      case 'to-map': view = 'map'; render(); break;
      case 'practice': startPractice(); break;
      case 'end-practice': endPractice(false); break;
      case 'save-cap': { const v = parseInt(document.getElementById('capInput').value, 10); if (!isNaN(v)) { S.settings.freePlayCapMin = clamp(v, 0, 60); save(); toast('נשמר'); render(); } break; }
      case 'toggle-speak': S.settings.autoSpeak = !S.settings.autoSpeak; save(); render(); break;
      case 'change-pin': { const p = prompt('קוד חדש, 4 ספרות'); if (p && /^\d{4}$/.test(p.trim())) { S.settings.coachPin = p.trim(); save(); toast('הקוד הוחלף'); } else if (p !== null) toast('צריך 4 ספרות'); break; }
      case 'export': exportSave(); break;
      case 'import-show': document.getElementById('importBox').classList.toggle('hidden'); break;
      case 'import': importSave(document.getElementById('importText').value); break;
      case 'reset-today': if (confirm('לאפס את המשימה של היום? הקלפים שכבר זזו נשארים במקומם; רק אפשר יהיה לעשות משימה נוספת היום.')) { const d = S.days[todayStr()]; if (d && d.session) { S.sessionCount = Math.max(0, S.sessionCount - 1); delete d.session; S.landsIntroduced = S.landsIntroduced.filter(l => l.date !== todayStr()); S.packsIntroduced = S.packsIntroduced.filter(p => p.date !== todayStr()); S.story.runs = S.story.runs.filter(r => r.date !== todayStr()); save(); toast('אופס'); render(); } } break;
      case 'reset-all': if (confirm('למחוק את כל ההתקדמות? אין דרך חזרה.') && confirm('בטוח? כדאי לייצא שמירה קודם.')) { S = freshState(); save(); view = 'onboarding'; render(); } break;
    }
  });

  function startNewRound() {
    const land = R.newLand;
    ensureCards(land.words, R.n);
    S.landsIntroduced.push({ id: land.id, date: todayStr() }); save();
    logEvent('land_intro', { id: land.id });
    const q = [];
    land.words.forEach(wid => { q.push(cardId(wid, 'rec')); q.push(cardId(wid, 'lineup')); });
    R.queue = shuffle(q).map(cid => ({ cid, retry: false, retries: 0 }));
    setPhase('new'); R.done = 0; R.round = { title: landNewLabel(land), total: R.queue.length };
    nextCard();
  }

  function exportSave() {
    const data = JSON.stringify(S);
    try {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `hey1-save-${todayStr()}.json`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { /* fallthrough */ }
    const box = document.getElementById('importBox'); const ta = document.getElementById('importText');
    if (box && ta) { box.classList.remove('hidden'); ta.value = data; ta.select(); toast('השמירה גם כאן למטה, אפשר להעתיק'); }
  }
  function importSave(text) {
    try { const s = JSON.parse(text); if (!s || s.version !== 1 || !s.cards) throw new Error('bad'); const pin = S.settings.coachPin; S = Object.assign(freshState(), s); if (!S.settings.coachPin) S.settings.coachPin = pin; save(); toast('השמירה נטענה'); view = 'map'; render(); }
    catch (e) { toast('הקובץ לא תקין'); }
  }

  // Coach access: a 2-second press on the star counter, then a parent PIN (set on first use).
  let pressTimer = null;
  $app.addEventListener('pointerdown', e => {
    const h = e.target.closest('#coachTap'); if (!h) return;
    pressTimer = setTimeout(() => { pressTimer = null; openCoach(); }, 2000);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => $app.addEventListener(ev, () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }));
  $app.addEventListener('contextmenu', e => { if (e.target.closest('#coachTap')) e.preventDefault(); });
  function openCoach() {
    if (!S.settings.coachPin) {
      const p = prompt('מסך המאמן: בחרו קוד בן 4 ספרות (ישמש מעכשיו)');
      if (!p || !/^\d{4}$/.test(p.trim())) { toast('צריך 4 ספרות'); return; }
      S.settings.coachPin = p.trim(); save();
    } else {
      const p = prompt('קוד מאמן');
      if (!p || p.trim() !== S.settings.coachPin) { if (p !== null) toast('לא הקוד'); return; }
    }
    view = 'coach'; render();
  }

  // animate counters on the close screen
  const origRender = render;
  function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count, 10); const start = performance.now(); const dur = 700;
      const step = now => { const p = Math.min(1, (now - start) / dur); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      setTimeout(() => { el.textContent = target; }, dur + 150); // frames pause in background tabs
    });
  }
  onRenderedAlways(animateCounters);
  function onRenderedAlways(fn) { const prev = afterRender; afterRender = function () { prev(); fn(); }; }
  void origRender;

  // ---------- boot ----------
  if (!S.hero) view = 'onboarding';
  render();

  // Expose for debugging in the browser console.
  window.__game = { get state() { return S; }, get session() { return R; }, save, render, Audio, startSession, startPractice };
})();
