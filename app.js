/* Hey! Unit 1 game — M1 playable core.
   Vanilla JS, no build step. State in localStorage. See prd.md. */
(() => {
  'use strict';
  const C = window.CONTENT;
  const ALL_WORDS = [...C.words, ...(C.starter || [])];
  const WORDS = Object.fromEntries(ALL_WORDS.map(w => [w.id, w]));
  const WORD_LAND = {};
  C.lands.forEach(l => l.words.forEach(w => { WORD_LAND[w] = l.id; }));
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
  function parseCard(cid) { const [wid, type] = cid.split('|'); return { cid, word: WORDS[wid], type, st: S.cards[cid] }; }
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

  function buildReviewQueue(n) {
    const due = Object.keys(S.cards).filter(cid => isDue(S.cards[cid], n));
    const pri = due.filter(cid => S.cards[cid].priority > 0);
    const rest = due.filter(cid => S.cards[cid].priority === 0);
    const byBox = {}; rest.forEach(cid => { const b = S.cards[cid].box; (byBox[b] = byBox[b] || []).push(cid); });
    let q = [...shuffle(pri)];
    for (const b of [4, 3, 2, 1]) if (byBox[b]) q.push(...shuffle(byBox[b]));
    if (q.length > C.reviewStackCap) q = q.slice(0, C.reviewStackCap);
    return q.map(cid => ({ cid, retry: false, retries: 0 }));
  }

  function startSession(mode) {
    const n = S.sessionCount + 1;
    const queue = buildReviewQueue(n);
    const newLand = mode === 'parent' ? nextLandForToday() : null;
    if (!queue.length && !newLand) {
      toast(mode === 'solo' && !Object.keys(S.cards).length ? 'את הראשונה עושים עם הורה 👨‍👩‍👦' : 'הכול נח עד מחר 😴', 4500);
      view = 'map'; render(); return;
    }
    R = {
      n, mode, date: todayStr(), startedAt: Date.now(), phase: 'review', queue, current: null,
      reviewTotal: queue.length, done: 0, correct: 0, wrong: 0, promoted: 0, demoted: 0, combo: 0, maxCombo: 0,
      newLand, introIdx: 0, mastered: [], hardStop: false, firstTry: {},
    };
    logEvent('session_start', { n, mode });
    view = 'mission'; render();
  }

  function elapsedMin() { return (Date.now() - R.startedAt) / 60000; }

  function nextCard() {
    if (!R) return;
    if (elapsedMin() >= C.sessionHardStopMin) { R.hardStop = true; return finishSession(); }
    if (!R.queue.length) {
      if (R.phase === 'review' && R.newLand) { R.phase = 'intro'; R.introIdx = 0; view = 'intro'; return render(); }
      return finishSession();
    }
    R.current = R.queue.shift();
    R.current.view = makeCardView(R.current.cid);
    view = 'card'; render();
  }

  function makeCardView(cid) {
    const { word, type } = parseCard(cid);
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
    const dur = Date.now() - R.startedAt;
    S.sessionCount = R.n;
    const code = String(hashCode(`${R.n}-${R.date}-hey1`) % 10000).padStart(4, '0');
    const rec = {
      n: R.n, mode: R.mode, startedAt: R.startedAt, durationMs: dur, correct: R.correct, wrong: R.wrong,
      promoted: R.promoted, demoted: R.demoted, maxCombo: R.maxCombo, hardStop: R.hardStop,
      newLand: R.newLand ? R.newLand.id : null, mastered: R.mastered.length, code,
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
    const pool = Object.keys(S.cards).filter(cid => S.cards[cid].box <= 2);
    const q = (pool.length ? shuffle(pool) : shuffle(Object.keys(S.cards))).map(cid => ({ cid, retry: false, retries: 0 }));
    if (!q.length) { toast('עוד אין קלפים לאימון'); return; }
    P = { queue: q, current: null, seen: 0, correct: 0, wrong: 0, combo: 0, maxCombo: 0, misses: {}, startedAt: Date.now(), lastTick: Date.now() };
    logEvent('practice_start', {});
    nextPracticeCard();
  }
  function tickPractice() {
    if (!P) return;
    const now = Date.now(); today().freePlaySec += Math.round((now - P.lastTick) / 1000); P.lastTick = now; save();
    if (today().freePlaySec >= S.settings.freePlayCapMin * 60) { endPractice(true); return false; }
    return true;
  }
  function nextPracticeCard() {
    if (!tickPractice()) return;
    if (!P.queue.length) { const pool = Object.keys(S.cards).filter(cid => S.cards[cid].box <= 2); P.queue = (pool.length ? shuffle(pool) : shuffle(Object.keys(S.cards))).map(cid => ({ cid, retry: false, retries: 0 })); }
    P.current = P.queue.shift(); P.current.view = makeCardView(P.current.cid);
    view = 'practice'; render();
  }
  function endPractice(capped) {
    if (P) { tickPractice(); logEvent('practice_end', { seen: P.seen, correct: P.correct, wrong: P.wrong }); }
    P = null; view = 'map'; render();
    if (capped) toast('המגרש נסגר. המאמן הלך לאכול 🍕', 4500);
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
        { kind: 'land', land: L[5], x: 76, y: 52 }, { kind: 'tower', g: C.grammar[1], x: 84, y: 37 },
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
        if (s.kind === 'tower') return `<div class="node locked" style="left:${s.x}%; top:${s.y}%"><div class="dot">🔒</div><div class="label">${sk.tower}</div><div class="stat en" style="letter-spacing:0">${esc(s.g.short)}</div></div>`;
        return `<div class="node locked boss" style="left:${s.x}%; top:${s.y}%"><div class="dot">${sk.bossIcon}</div><div class="label">${sk.boss}</div><div class="stat">עוד לא פתוח</div></div>`;
      };
      const road = smoothPath(stops.map(s => [s.x, s.y]));
      const nl = nextLandForToday();
      const questLead = done ? 'זהו להיום. המפה סגורה.' : (hasCards ? 'המילים של היום מחכות.' : 'הציוד שלך מחכה.');
      const questSub = done ? 'יש לה יום גדול מחר.' : `${dueCount ? `${dueCount} קלפים שבטוחים ששכחת אותם` : ''}${dueCount && nl ? ' · ' : ''}${nl ? (nl.starter ? sk.starterNew : `${sk.newTerritory} לכבוש`) : ''}`;
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
        <div class="ranks">${[1, 2, 3, 4, 5].map(b => `<div class="rank"><b>${bc[b]}</b><span>${sk.boxNames[b - 1]}</span></div>`).join('')}</div>`;
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
        ${rec.mode === 'solo' ? `<div class="card" style="margin-top:12px"><div class="center muted">הקוד. להראות להורים, לא ל${sk.boss}.</div><div class="code">${rec.code}</div></div>` : ''}
        <div class="ranks">${[1, 2, 3, 4, 5].map(b => `<div class="rank"><b>${bc[b]}</b><span>${sk.boxNames[b - 1]}</span></div>`).join('')}</div>
        <div class="bigcta"><button class="btn primary block" data-action="to-map">למפה</button></div>`;
    },

    coach() { return coachScreen(); },
  };

  function cardScreen(rt, practice) {
    const item = rt.current; const v = item.view; const w = v.prompt;
    const total = practice ? null : (R.phase === 'review' ? R.reviewTotal : R.newLand.words.length * 2);
    const progress = practice ? 0 : clamp(Math.round(100 * rt.done / Math.max(1, total)), 0, 100);
    const sk = skin(); const st = S.cards[item.cid];
    const header = practice
      ? topbar('🏋️ מגרש האימונים', '', `<button class="btn small" data-action="end-practice">סיום</button>`)
      : topbar(R.phase === 'review' ? 'חזרה' : landNewLabel(R.newLand), `${rt.done}/${total}${item.retry ? ' · 🔁' : ''}`, `<span class="combo ${rt.combo >= 5 ? 'hot' : ''}">${rt.combo >= 2 ? `x${rt.combo}` : ''}</span>`);
    const ladder = `<div class="boxladder" title="קופסה">${[1, 2, 3, 4, 5].map(b => `<span class="${b <= st.box ? (b === 5 ? 'top' : 'on') : ''}"></span>`).join('')}</div>`;

    let prompt = '', options = '';
    const optBtn = (o, label, cls) => `<button class="opt ${cls}" data-action="answer" data-id="${o.id}">${label}</button>`;
    if (v.kind === 'rec') {
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
      <div class="options" id="options">${options}</div>
      <div id="feedback"></div>`;
  }

  function handleAnswer(id) {
    const rt = P || R; if (!rt || !rt.current || rt.current.answered) return;
    const item = rt.current; const v = item.view; const w = v.prompt; const correct = id === v.answerId;
    item.answered = true;
    const practice = !!P;
    const prevBox = S.cards[item.cid].box;
    applyAnswer(item, correct, practice);
    if (!practice) R.done++;
    const st = S.cards[item.cid];
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
      Audio.speak(w.en);
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
        ${milestone ? `<span class="combo-big">x${rt.combo} 🔥</span>` : ''}
        ${mastered ? `<span class="he big">נכבש! 🏆</span>` : ''}
      </div>`;
      if (milestone) document.body.classList.add('flash'), setTimeout(() => document.body.classList.remove('flash'), 500);
      // move on when the word has finished being spoken (capped), so the next card never cuts it off;
      // the lineup card shows the meaning too, so it lingers a little longer
      const lingerMin = mastered ? 2200 : (v.kind === 'lineup' ? 1500 : 900);
      const lingerMax = v.kind === 'lineup' ? 2300 : 1700;
      Audio.afterSpeech(() => practice ? nextPracticeCard() : nextCard(), lingerMin, lingerMax);
    } else {
      Audio.hm();
      setTimeout(() => Audio.speak(w.en), 350);
      const demoted = !practice && !item.retry && st.box < prevBox;
      // the ladder square going dark + the thud carry the demotion; no sentence needed
      if (demoted) { Audio.thud(); const sq = document.querySelectorAll('.boxladder span')[prevBox - 1]; if (sq) sq.classList.remove('on', 'top'); }
      $fb.innerHTML = `<div class="feedback miss">
        <div class="row" style="justify-content:center; gap:18px"><span class="en mid">${esc(w.en)}</span><span class="he big">${esc(w.he)}</span></div>
        ${w.chunks !== w.en ? `<div class="chunks en center">${esc(w.chunks)}</div>` : ''}
        <div class="tip center">💡 ${esc(w.tip)}</div>
        <button class="btn primary" style="margin-top:10px" data-action="continue">הלאה</button>
      </div>`;
    }
  }

  function coachScreen() {
    const sk = skin(); const bc = boxCounts(); const d = today();
    const sessions = Object.entries(S.days).filter(([, v]) => v.session).sort((a, b) => a[0] < b[0] ? 1 : -1);
    const tricky = Object.entries(S.cards).filter(([, st]) => st.misses >= 3).sort((a, b) => b[1].misses - a[1].misses).slice(0, 12);
    const lands = S.landsIntroduced.map(l => `${landName(C.lands.find(x => x.id === l.id) || { id: l.id })} (${l.date})`).join(', ') || 'עדיין לא';
    return `
      ${topbar('מסך המאמן', 'להורים בלבד', `<button class="btn small" data-action="to-map">סגור</button>`)}
      <div class="card coach">
        <h3>הקופסאות (כל הקלפים: ${Object.keys(S.cards).length})</h3>
        <div class="boxes">${[1, 2, 3, 4, 5].map(b => `<div><b>${bc[b]}</b>${b}· ${sk.boxNames[b - 1]}</div>`).join('')}</div>
        <h3>היום (${todayStr()})</h3>
        ${d.session ? `<div>משימה ${d.session.n} · ${d.session.mode === 'solo' ? 'לבד' : 'עם הורה'} · ${minutes(d.session.durationMs)} דק׳ · נכון ${d.session.correct} / טעויות ${d.session.wrong} · עלו ${d.session.promoted} / ירדו ${d.session.demoted}${d.session.hardStop ? ' · נעצר בזמן' : ''}${d.session.mode === 'solo' ? ` · <b>קוד: ${d.session.code}</b>` : ''}${d.session.mode === 'solo' && minutes(d.session.durationMs) < 4 && d.session.correct > 15 ? ' · ⚠️ מהר מדי?' : ''}</div>` : '<div class="muted">עדיין לא הייתה משימה היום</div>'}
        <div>מגרש האימונים היום: ${Math.floor(d.freePlaySec / 60)} דק׳ מתוך ${S.settings.freePlayCapMin}</div>
        <div>${sk.territoriesLabel} שנפתחו: ${lands}</div>
        <h3>מילים קשות (3+ טעויות)</h3>
        ${tricky.length ? `<table><tr><th>מילה</th><th>סוג</th><th>טעויות</th><th>קופסה</th></tr>${tricky.map(([cid, st]) => { const p = parseCard(cid); return `<tr><td class="en">${esc(p.word.en)}</td><td>${{ rec: 'משמעות', lineup: 'שמיעה→קריאה', img: 'תמונה' }[p.type]}</td><td>${st.misses}</td><td>${st.box}</td></tr>`; }).join('')}</table>` : '<div class="muted">אין עדיין</div>'}
        <h3>היסטוריה</h3>
        ${sessions.length ? `<table><tr><th>תאריך</th><th>#</th><th>מצב</th><th>נכון/טעות</th><th>עלו/ירדו</th><th>דק׳</th><th>קוד</th></tr>${sessions.map(([date, v]) => `<tr><td>${date}</td><td>${v.session.n}</td><td>${v.session.mode === 'solo' ? 'לבד' : 'הורה'}</td><td>${v.session.correct}/${v.session.wrong}</td><td>${v.session.promoted}/${v.session.demoted}</td><td>${minutes(v.session.durationMs)}</td><td class="en">${v.session.mode === 'solo' ? v.session.code : ''}</td></tr>`).join('')}</table>` : '<div class="muted">אין עדיין</div>'}
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
      case 'to-map': view = 'map'; render(); break;
      case 'practice': startPractice(); break;
      case 'end-practice': endPractice(false); break;
      case 'save-cap': { const v = parseInt(document.getElementById('capInput').value, 10); if (!isNaN(v)) { S.settings.freePlayCapMin = clamp(v, 0, 60); save(); toast('נשמר'); render(); } break; }
      case 'toggle-speak': S.settings.autoSpeak = !S.settings.autoSpeak; save(); render(); break;
      case 'change-pin': { const p = prompt('קוד חדש, 4 ספרות'); if (p && /^\d{4}$/.test(p.trim())) { S.settings.coachPin = p.trim(); save(); toast('הקוד הוחלף'); } else if (p !== null) toast('צריך 4 ספרות'); break; }
      case 'export': exportSave(); break;
      case 'import-show': document.getElementById('importBox').classList.toggle('hidden'); break;
      case 'import': importSave(document.getElementById('importText').value); break;
      case 'reset-today': if (confirm('לאפס את המשימה של היום? הקלפים שכבר זזו נשארים במקומם; רק אפשר יהיה לעשות משימה נוספת היום.')) { const d = S.days[todayStr()]; if (d && d.session) { S.sessionCount = Math.max(0, S.sessionCount - 1); delete d.session; S.landsIntroduced = S.landsIntroduced.filter(l => l.date !== todayStr()); save(); toast('אופס'); render(); } } break;
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
    R.phase = 'new'; R.done = 0;
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
  window.__game = { get state() { return S; }, save, render, Audio, startSession, startPractice };
})();
