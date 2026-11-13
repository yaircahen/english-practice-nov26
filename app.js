/* Hey! Unit 1 game — M1 playable core + M2: grammar towers, writing track, story track (the test-facing half),
   then the mystery box and the wardrobe, streak freeze, brag card, reading minute and letter-tile cards.
   Vanilla JS, no build step. State in localStorage. See prd.md (v4).
   Every line the kid reads comes from the `copy` table in content.js, through t(). */
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
  const LOOT = (C.loot && C.loot.items) || [];
  const LOOT_ID = Object.fromEntries(LOOT.map(i => [i.id, i]));
  const SLOTS = (C.loot && C.loot.slots) || [];
  const TILE_CAP = C.tileCap == null ? 3 : C.tileCap;
  const STORAGE_KEY = 'hey1-game-v1';
  const $app = document.getElementById('app');
  const $fx = document.getElementById('fx');

  // ---------- utils ----------
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const sample = (arr, n) => shuffle(arr).slice(0, n);
  const pad2 = n => String(n).padStart(2, '0');
  const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const addDays = (str, k) => { const [y, m, d] = str.split('-').map(Number); const dt = new Date(y, m - 1, d + k); return todayStr(dt); };
  // the Sunday that opens the week a date falls in
  const weekKey = str => { const [y, m, d] = str.split('-').map(Number); const dt = new Date(y, m - 1, d); return addDays(str, -dt.getDay()); };
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
      // M2, the game half. Absent from a save made before it; same rule.
      loot: { owned: [], worn: {}, fresh: [], boxes: [], cleared: [] },   // owned: item ids · worn[slot] = item id · fresh: found, not yet seen in the wardrobe · boxes: [{ date, n, id, tier, why }] · cleared: territories whose rare drop was given
      streak: { frozen: {}, told: '' },                      // frozen[date] = 'auto' (the week's free one) | 'coach'
      reading: { again: [], seen: {}, history: [] },         // reading minute: ids marked "again" · seen[id] = session · history: [{ date, n, items }]
    };
  }
  // An older save lacks the newer fields. It gets their defaults; nothing it holds is dropped or renamed.
  function adopt(s) {
    const f = freshState(); const st = Object.assign({}, f, s);
    ['settings', 'story', 'writing', 'loot', 'streak', 'reading'].forEach(k => { st[k] = Object.assign({}, f[k], s[k]); });
    return st;
  }
  let S = load();
  function load() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.version === 1) return adopt(s); } } catch (e) { /* fall through */ }
    return freshState();
  }
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { toast(t('saveFailed')); } }
  function logEvent(type, data) { S.log.push(Object.assign({ t: Date.now(), type }, data || {})); if (S.log.length > 2000) S.log.splice(0, S.log.length - 2000); }

  const skinId = () => (S.hero && S.hero.skin) || 'map';
  const skin = () => C.skins[skinId()];
  const landName = l => l.starter ? skin().starterName : skin().names[l.id - 1];
  const landIcon = l => l.starter ? skin().starterIcon : skin().terrIcons[l.id - 1];
  const landNewLabel = l => l.starter ? skin().starterNew : skin().newTerritory;
  const today = () => S.days[todayStr()] || (S.days[todayStr()] = { freePlaySec: 0 });

  // ---------- copy ----------
  // t('key', { name: value }) returns a line from content.js with its {curly} names filled in.
  // The current skin's own words are always on hand, so '{boss}' or '{box}' work in any line.
  function t(key, vars) {
    const s = (C.copy || {})[key];
    if (s == null) return key;
    const sk = skin();
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null) ? vars[k] : (typeof sk[k] === 'string' ? sk[k] : m));
  }

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
    // Apple voices read a lone "I" as "capital I". Inside a sentence it is fine,
    // so only the standalone word gets respelled for speech (screen text is untouched).
    spoken(text) {
      return /^\s*["'“”]?I[.,!?]?["'“”]?\s*$/.test(text) ? 'eye' : text;
    },
    speak(text, rate = 0.85) {
      if (!('speechSynthesis' in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(this.spoken(text));
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
    sweep(f0, f1, dur, type, gain) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime; const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.04);
      o.connect(g); g.connect(this.ctx.destination); o.start(t0); o.stop(t0 + dur + 0.06);
    },
    // the pitch climbs with the combo whatever the sound; the sound itself is the one he wears (loot, cosmetic)
    ding(combo) {
      const f = 660 * (1 + Math.min(combo, 12) * 0.045);
      const worn = wornItem('ding'); const kind = worn ? worn.ding : '';
      if (kind === 'bell') { this.tone(f * 1.5, 0.45, 'sine', 0.11); this.tone(f * 3.02, 0.3, 'sine', 0.035); }
      else if (kind === 'bit') { this.tone(f, 0.07, 'square', 0.05); this.tone(f * 1.5, 0.11, 'square', 0.05, 0.07); }
      else if (kind === 'laser') this.sweep(f * 2.6, f * 0.9, 0.2, 'sawtooth', 0.05);
      else if (kind === 'harp') [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(f * m, 0.32, 'triangle', 0.09, i * 0.055));
      else if (kind === 'coin') { this.tone(f * 1.5, 0.07, 'square', 0.05); this.tone(f * 2, 0.32, 'square', 0.05, 0.075); }
      else { this.tone(f, 0.12, 'sine', 0.12); this.tone(f * 1.5, 0.18, 'sine', 0.1, 0.09); }
    },
    hm() { this.tone(220, 0.18, 'triangle', 0.08); this.tone(180, 0.22, 'triangle', 0.06, 0.12); },
    whoosh() { if (!this.ctx) return; const t0 = this.ctx.currentTime; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(300, t0); o.frequency.exponentialRampToValueAtTime(900, t0 + 0.25); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3); o.connect(g); g.connect(this.ctx.destination); o.start(t0); o.stop(t0 + 0.32); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.12, i * 0.12)); },
    thud() { this.tone(120, 0.15, 'sine', 0.1); },
    tick() { this.tone(520, 0.05, 'sine', 0.05); },
  };
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => Audio.pickVoice();
  document.addEventListener('pointerdown', () => Audio.init(), { once: true });

  // ---------- effects ----------
  let toastTimer = null;
  function toast(msg, ms = 3500) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }
  function confetti(n = 70) {
    const worn = wornItem('confetti');                          // loot: its colours, or a little picture instead of paper
    const colors = (worn && worn.colors) || ['#d7a62a', '#2f6f4e', '#c47b3a', '#5b3a8a', '#2b4c7e', '#e05a7a'];
    const glyph = worn && worn.glyph;
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div'); d.className = 'confetti';
      d.style.left = Math.random() * 100 + 'vw';
      if (glyph) { d.classList.add('glyph'); d.textContent = glyph; } else d.style.background = colors[i % colors.length];
      d.style.animationDelay = (Math.random() * 0.5) + 's'; d.style.transform = `rotate(${Math.random() * 360}deg)`;
      $fx.appendChild(d); setTimeout(() => d.remove(), 2400);
    }
  }

  // ---------- cards / Leitner ----------
  const cardId = (wid, type) => `${wid}|${type}`;
  const isTile = cid => cid.endsWith('|tile');
  function cardTypesFor(w) { const types = ['rec', 'lineup']; if (w.emoji) types.push('img'); return types; }
  function ensureCards(wordIds, sessionN) {
    wordIds.forEach(wid => cardTypesFor(WORDS[wid]).forEach(type => {
      const cid = cardId(wid, type);
      if (!S.cards[cid]) S.cards[cid] = { box: 1, lastSession: 0, misses: 0, born: sessionN, priority: 0 };
    }));
  }
  function parseCard(cid) { const [wid, type] = cid.split('|'); return { cid, word: WORDS[wid], g: GITEMS[wid], type, st: S.cards[cid] }; }
  // a card whose item is no longer in the content (renamed or removed) is skipped, never crashed on
  // A picture card stays in the save after its word loses its emoji; skip it rather than show an empty picture.
  function known(cid) { const p = parseCard(cid); return !!(p.g || (p.word && (p.type !== 'img' || p.word.emoji))); }
  function cardLabel(cid) { const p = parseCard(cid); if (p.word) return p.word.en; if (!p.g) return cid; return p.g.t ? p.g.t.replace('___', `[${p.g.a}]`) : (p.g.en ? `${p.g.en} → ${p.g.a}` : `${(p.g.pic || p.g.lines).join(' / ')} → ${p.g.a}`); }
  const packCards = id => Object.values(GITEMS).filter(g => g.pack === id).map(g => cardId(g.id, g.kind));
  function ensureItemCards(cids, sessionN) { cids.forEach(cid => { if (!S.cards[cid]) S.cards[cid] = { box: 1, lastSession: 0, misses: 0, born: sessionN, priority: 0 }; }); }
  // Production, light (PRD §6.2): a word's letter-tile card is born when its Recognition card reaches Box 3.
  // Only the 50 words get one. It is first due in the session after `lastSession`.
  function birthTile(wid, lastSession) {
    const w = WORDS[wid]; const cid = cardId(wid, 'tile');
    if (!w || w.starter || S.cards[cid]) return false;
    S.cards[cid] = { box: 1, lastSession, misses: 0, born: lastSession, priority: 0 };
    return true;
  }
  // a save from before the tile cards: every word already in Box 3 or higher gets its card now
  function birthTiles() {
    let n = 0;
    Object.keys(S.cards).forEach(cid => { const [wid, type] = cid.split('|'); if (type === 'rec' && S.cards[cid].box >= 3 && birthTile(wid, S.sessionCount)) n++; });
    if (n) save();
  }
  function packIntroduced(id) { return S.packsIntroduced.some(p => p.id === id); }
  function towerProgress(g) {
    let total = 0, mastered = 0;
    (g.units || []).forEach(u => packCards(u).forEach(cid => { const st = S.cards[cid]; if (st) { total++; if (st.box >= 4) mastered++; } }));
    return { total, mastered, pct: total ? Math.round(100 * mastered / total) : 0, open: (g.units || []).some(packIntroduced) };
  }
  // "mastered" is Box 4–5 (PRD §2), as on the map; Box 5 can't be reached in a two-week run
  const MASTERED_BOX = C.masteredBox || 4;
  function isDue(st, n) { if (st.box >= 5) return false; return (n - st.lastSession) >= C.intervals[st.box]; }
  function boxCounts() { const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; Object.keys(S.cards).filter(known).forEach(cid => c[S.cards[cid].box]++); return c; }   // a skipped card isn't counted either
  // a land's flag is about its three core card types; the tile cards, born later, never take a flag down
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
    return C.words.filter(w => { const st = S.cards[cardId(w.id, 'rec')]; return st && st.box >= MASTERED_BOX; }).length;
  }
  function todayDone() { const d = S.days[todayStr()]; return !!(d && d.session); }
  // a day can hold a solo session and then a parent one; the earlier ones sit in `earlier`, the latest in `session`
  const daySessions = d => d ? [...(d.earlier || []), ...(d.session ? [d.session] : [])] : [];
  const todayNs = () => daySessions(S.days[todayStr()]).map(r => r.n);

  // ---------- streak, with one free freeze a week (PRD §7.3, CD8) ----------
  // A day counts when its quest was finished. A frozen day adds nothing and breaks nothing.
  const played = d => !!(S.days[d] && S.days[d].session);
  function streak() {
    let n = 0; let d = todayStr();
    if (!played(d)) d = addDays(d, -1);
    for (let i = 0; i < 400; i++) {
      if (played(d)) n++; else if (!S.streak.frozen[d]) break;
      d = addDays(d, -1);
    }
    return n;
  }
  const autoFrozenIn = wk => Object.keys(S.streak.frozen).some(d => S.streak.frozen[d] === 'auto' && weekKey(d) === wk);
  const freezeLeft = () => !autoFrozenIn(weekKey(todayStr()));
  // The week's free freeze covers a single missed day that follows a played one. It is spent by itself,
  // the first time the app is opened after the gap; two missed days in a row need the coach's button.
  function settleStreak() {
    const fz = S.streak.frozen; let changed = false;
    let d = addDays(todayStr(), -1);
    for (let i = 0; i < 60; i++) {
      if (played(d) || fz[d]) { d = addDays(d, -1); continue; }
      const prev = addDays(d, -1);
      if (!played(prev) || autoFrozenIn(weekKey(d))) break;
      fz[d] = 'auto'; changed = true; d = prev;
    }
    if (changed) { logEvent('freeze', { auto: true }); save(); }
  }
  // Coach: a sick day or a trip. Freezes every missed day since the last quest, today included.
  function coachFreeze() {
    const gap = []; let d = todayStr();
    for (let i = 0; i < 21 && !played(d); i++) { if (!S.streak.frozen[d]) gap.push(d); d = addDays(d, -1); }
    if (!played(d)) return -1;                                 // no quest in the last three weeks: nothing to keep alive
    gap.forEach(x => { S.streak.frozen[x] = 'coach'; });
    if (gap.length) { logEvent('freeze', { coach: gap.length }); save(); }
    return gap.length;
  }

  // ---------- loot (PRD §7.5, §7.6) ----------
  // Cosmetic only. Nothing below reads or changes a card, a box, a level or the map's progress.
  const lootPool = () => LOOT.filter(i => !i.skin || i.skin === skinId());
  const owns = id => S.loot.owned.includes(id);
  function wornItem(slot) { const it = LOOT_ID[S.loot.worn[slot]]; return it && owns(it.id) && (!it.skin || it.skin === skinId()) ? it : null; }
  const RANK = { common: 0, rare: 1, golden: 2 };
  function rollTier(floor, why) {
    const odds = C.loot.odds; const r = Math.random();
    const tier = r < odds.golden ? 'golden' : (r < odds.golden + odds.rare ? 'rare' : 'common');
    let min = floor || 'common';
    if (why === 'box') {
      const daily = S.loot.boxes.filter(b => b.why === 'box');
      // the first box is never a plain one · never three plain ones in a row · a golden one at least every sixth box
      if (!daily.length || (daily.length >= 2 && daily.slice(-2).every(b => b.tier === 'common'))) min = 'rare';
      if (daily.length >= 5 && !daily.slice(-5).some(b => b.tier === 'golden')) min = 'golden';
    }
    return RANK[tier] >= RANK[min] ? tier : min;
  }
  function pickLoot(tier) {
    const pool = lootPool(); const free = pool.filter(i => !owns(i.id)); if (!free.length) return null;
    // the tier that was rolled, or the nearest one that still has something in it
    const order = { common: ['common', 'rare', 'golden'], rare: ['rare', 'golden', 'common'], golden: ['golden', 'rare', 'common'] }[tier];
    const inTier = order.map(x => free.filter(i => i.tier === x)).find(a => a.length);
    // the very first find is something to wear; after that, an empty shelf in the wardrobe fills first
    const wear = S.loot.owned.length ? [] : inTier.filter(i => i.slot === 'hat' || i.slot === 'pal');
    const empty = inTier.filter(i => !pool.some(o => o.slot === i.slot && owns(o.id)));
    return sample(wear.length ? wear : (empty.length ? empty : inTier), 1)[0];
  }
  // The nine territories: five word lands and four grammar towers. Clearing one is worth a rare find.
  const TERR = [...C.lands.filter(l => !l.starter).map(l => ({ key: 'L' + l.id, land: l })), ...C.grammar.map(g => ({ key: g.id, g }))];
  const terrOpen = tr => tr.land ? landIntroduced(tr.land.id) : (tr.g.units || []).some(packIntroduced);
  function terrCleared(tr) {
    if (tr.land) { const p = landProgress(tr.land); return landIntroduced(tr.land.id) && p.total > 0 && p.pct === 100; }
    const p = towerProgress(tr.g); return (tr.g.units || []).every(packIntroduced) && p.total > 0 && p.pct === 100;
  }
  const terrName = tr => tr.land ? landName(tr.land) : `${skin().tower} <span class="en">${esc(tr.g.short)}</span>`;
  // one quest, one box (PRD §7.4); the coach can thin it to every second quest (PRD §7.3)
  function boxDue(n) {
    const daily = S.loot.boxes.filter(b => b.why === 'box');
    if (daily.some(b => b.date === todayStr())) return false;
    const last = daily[daily.length - 1];
    return !((S.settings.boxEvery || 1) === 2 && last && last.n === n - 1);
  }
  // Called once, when a quest ends. What it gives is his from that moment; opening the box is the show.
  function grantLoot(n) {
    const drops = []; if (!LOOT.length) return drops;
    const give = (floor, why) => {
      const it = pickLoot(rollTier(floor, why)); if (!it) return;
      S.loot.owned.push(it.id); S.loot.fresh.push(it.id);
      S.loot.boxes.push({ date: todayStr(), n, id: it.id, tier: it.tier, why });
      drops.push({ id: it.id, why, opened: false, done: false });
    };
    if (boxDue(n)) give(null, 'box');
    TERR.filter(tr => !S.loot.cleared.includes(tr.key) && terrCleared(tr)).slice(0, 2).forEach(tr => { S.loot.cleared.push(tr.key); give('rare', tr.key); });
    return drops;
  }
  function previewLoot(it) {
    if (it.slot === 'confetti') { Audio.tick(); confetti(36); } else if (it.slot === 'ding') Audio.ding(4); else Audio.tick();
  }
  function avatar(size) {
    const hat = wornItem('hat'), pal = wornItem('pal'), aura = wornItem('aura');
    return `<div class="avatar ${size || ''} ${aura ? aura.css : ''}"><span class="base">${skin().icon}</span>${hat ? `<span class="hat">${hat.e}</span>` : ''}${pal ? `<span class="pal">${pal.e}</span>` : ''}</div>`;
  }

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
    if (pool.length < 3) pool.push(...sample(ALL_WORDS.filter(w => w.emoji && w.id !== word.id && w.emoji !== word.emoji && !pool.some(x => x.emoji === w.emoji)), 3 - pool.length));
    return shuffle([word, ...pool]);
  }

  // ---------- session runtime ----------
  let R = null;     // quest session
  let P = null;     // practice (training grounds)
  let view = 'map';

  function buildReviewQueue(n, cap = C.reviewStackCap) {
    // one promotion per card per day (PRD §6.1): a card already reviewed in today's earlier session waits
    const seenToday = todayNs();
    const all = Object.keys(S.cards).filter(cid => known(cid) && isDue(S.cards[cid], n) && !seenToday.includes(S.cards[cid].lastSession));
    // the letter-tile cards are the light ones: a few a session, highest box first; the rest stay due.
    // Those few always get their turn (a full stack would otherwise crowd them out every day), and each
    // takes about the time of two ordinary cards, so the rest of the stack gives up two places for each.
    const tiles = shuffle(all.filter(isTile)).sort((a, b) => S.cards[b].box - S.cards[a].box).slice(0, TILE_CAP);
    const due = all.filter(cid => !isTile(cid));
    cap = Math.max(8, cap - 2 * tiles.length);
    const pri = due.filter(cid => S.cards[cid].priority > 0);
    const rest = due.filter(cid => S.cards[cid].priority === 0);
    const byBox = {}; rest.forEach(cid => { const b = S.cards[cid].box; (byBox[b] = byBox[b] || []).push(cid); });
    let q = [...shuffle(pri)];
    for (const b of [4, 3, 2, 1]) if (byBox[b]) q.push(...shuffle(byBox[b]));
    if (q.length > cap) {
      // what gives way first: recognition cards of words already in Box 3 and up (PRD §7.4)
      const easy = cid => !!parseCard(cid).word && S.cards[cid].box >= 3 && !S.cards[cid].priority;
      // then the strongest boxes wait a session; priority cards and Box 1 (reviewed every session, §6.1) always stay
      // a card cut today comes back sooner: each session it waits past due moves it up, so nothing is cut for good
      const over = cid => n - S.cards[cid].lastSession - C.intervals[S.cards[cid].box];
      const rank = cid => S.cards[cid].priority > 0 ? -1000 : S.cards[cid].box === 1 ? -999 : -3 * over(cid) + (easy(cid) ? 9 : S.cards[cid].box);
      const kept = new Set([...q].sort((a, b) => rank(a) - rank(b)).slice(0, cap));   // stable: keeps the shuffle inside a box
      q = q.filter(cid => kept.has(cid));                                              // and the play order stays highest box first
    }
    // the tile cards take their place by box, after the other cards of that box
    if (tiles.length) { q.push(...tiles); q.sort((a, b) => (S.cards[b].priority - S.cards[a].priority) || (S.cards[b].box - S.cards[a].box)); }
    return q.map(cid => ({ cid, retry: false, retries: 0 }));
  }

  // ----- what a session holds (PRD §7.4, §8). Everything is state-driven, not calendar-driven. -----
  const CARDS_PER_MIN = 10;                                  // planning estimate only; his log shows about 11 a minute in review
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

  // after a solo session, a parent session the same day is worth it only when it opens something new
  function parentExtras() {
    const ses = daySessions(S.days[todayStr()]);
    if (!ses.length || ses.some(r => r.mode === 'parent')) return false;
    const newLand = nextLandForToday(), story = storyForSession('parent', newLand);
    return !!(newLand || unitForToday(newLand) || sdForToday(newLand) || (story && !story.reread));
  }
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
      toast(t(mode === 'solo' && !Object.keys(S.cards).length ? 'firstWithParent' : 'allRest'), 4500);
      view = 'map'; render(); return;
    }
    R = {
      n, mode, date: todayStr(), startedAt: Date.now(), phase: 'review', phaseAt: Date.now(), timing: {}, queue, current: null,
      reviewTotal: queue.length, round: { title: t('roundReview'), total: queue.length },
      done: 0, correct: 0, wrong: 0, promoted: 0, demoted: 0, combo: 0, maxCombo: 0,
      newLand, introIdx: 0, mastered: [], hardStop: false, firstTry: {},
      plan: { unit, sd, writing, story }, pack: null, packsDone: [], w: null, st: null, wResult: null, stResult: null,
      rd: null, rdResult: null,
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
    if (type === 'tile') return { kind: 'tile', prompt: word, answerId: word.id, b: newTileBuild(word), res: null };
    if (type === 'rec') return { kind: 'rec', prompt: word, options: hebrewOptions(word), answerId: word.id };
    if (type === 'lineup') return { kind: 'lineup', prompt: word, options: englishOptions(word), answerId: word.id };
    const toEmoji = Math.random() < 0.5;
    return { kind: toEmoji ? 'img' : 'img-rev', prompt: word, options: emojiOptions(word), answerId: word.id };
  }

  function applyAnswer(item, correct, practice) {
    const st = S.cards[item.cid]; let born = false;
    if (!practice && !item.retry) {
      st.lastSession = R.n; st.priority = 0;
      if (correct) { if (st.box < 5) { st.box++; R.promoted++; if (st.box === MASTERED_BOX) R.mastered.push(item.cid); } }
      else { st.misses++; if (st.box > 1) { st.box--; R.demoted++; } }
      // Recognition has reached Box 3: the word's letter-tile card is born, due from the next session
      if (correct && st.box >= 3 && item.cid.endsWith('|rec')) born = birthTile(item.cid.split('|')[0], R.n);
    }
    if (practice) {
      P.seen++;
      if (!correct) { P.misses[item.cid] = (P.misses[item.cid] || 0) + 1; if (P.misses[item.cid] >= 3) st.priority = 1; }
    }
    const rt = practice ? P : R;
    if (correct) { rt.correct++; rt.combo++; rt.maxCombo = Math.max(rt.maxCombo, rt.combo); }
    // a missed card comes back at the end of the session; a tile card does not (he has just rebuilt it in place)
    else { rt.wrong++; rt.combo = 0; if (item.retries < 2 && !isTile(item.cid)) rt.queue.push({ cid: item.cid, retry: true, retries: item.retries + 1 }); }
    save();
    return { born };
  }

  let closeFx = false;      // the close screen's fanfare plays once, not on every redraw
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
      reading: R.rdResult,                                               // the parent's marks: coach log only
    };
    if (today().session) (today().earlier = today().earlier || []).push(today().session);
    today().session = rec;
    // cosmetic, and decided only after everything that counts is recorded; whatever happens in there, the quest still closes
    try { rec.loot = grantLoot(R.n); } catch (e) { rec.loot = []; }
    settleStreak();
    logEvent('session_end', rec);
    save();
    closeFx = true;
    view = 'close'; render();
  }

  // ---------- training grounds ----------
  function startPractice() {
    const cap = S.settings.freePlayCapMin * 60;
    if (today().freePlaySec >= cap) { toast(t('practiceShut')); return; }
    const q = practicePool().map(cid => ({ cid, retry: false, retries: 0 }));
    if (!q.length) { toast(t('practiceEmpty')); return; }
    P = { queue: q, current: null, seen: 0, correct: 0, wrong: 0, combo: 0, maxCombo: 0, misses: {}, startedAt: Date.now(), lastTick: Date.now() };
    logEvent('practice_start', {});
    nextPracticeCard();
  }
  function practicePool() {
    const all = Object.keys(S.cards).filter(cid => known(cid) && !isTile(cid));
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
    if (capped) toast(t('practiceCapped'), 4500);
  }

  // ---------- letter-tile cards (PRD §6.2 "Production, light") ----------
  // Hebrew word → build the English word from letter tiles. Strict marking: the first full row decides;
  // a wrong tile is shown, so the miss teaches, and he puts it right before moving on.
  const LOOKALIKE = { a: 'eo', e: 'ai', i: 'ey', o: 'ua', u: 'oa', b: 'dp', d: 'bt', p: 'bq', t: 'df', s: 'zc', f: 'vt', w: 'vm', y: 'ij', l: 'it', m: 'nw', n: 'mh', c: 'ks', k: 'cx', g: 'jq', h: 'nb', r: 'nl', v: 'wf' };
  function newTileBuild(w) {
    // the slots are grouped the way the word is chunked on its intro card: in·for·ma·tion, a · lot · of
    let groups = w.chunks.split(' · ').map(part => part.split('·'));
    if (groups.flat().join('') !== w.en.replace(/ /g, '')) groups = w.en.split(' ').map(part => [part]);
    const target = groups.flat().join('').split('');
    // a short word gets two letters that do not belong, so it is never a coin toss
    const extra = [];
    if (target.length <= 4) shuffle(target).forEach(ch => (LOOKALIKE[ch] || '').split('').forEach(x => { if (extra.length < 2 && !target.includes(x) && !extra.includes(x)) extra.push(x); }));
    return { groups, target, tray: shuffle([...target, ...extra].map((text, i) => ({ id: 'l' + i, text }))), slots: target.map(() => null), wrong: [], clean: true, solved: false, extra: extra.length > 0 };
  }
  function tilePlace(id) {
    const item = R && R.current; const b = item && item.view && item.view.b; if (!b || b.solved || b.slots.includes(id)) return;
    const i = b.slots.indexOf(null); if (i < 0) return;
    b.slots[i] = id;
    if (b.slots.includes(null)) { Audio.tick(); return render(); }
    const text = x => b.tray.find(k => k.id === x).text;
    b.wrong = b.slots.map((x, k) => text(x) === b.target[k] ? -1 : k).filter(k => k >= 0);
    if (b.wrong.length) { b.clean = false; Audio.hm(); return render(); }
    b.solved = true; tileResolve(item);
  }
  function tileUnplace(i) { const item = R && R.current; const b = item && item.view && item.view.b; if (!b || b.solved || b.slots[i] == null) return; b.slots[i] = null; b.wrong = b.wrong.filter(k => k !== i); render(); }   // the other wrong tiles keep their mark
  function tileResolve(item) {
    const v = item.view, w = v.prompt, clean = v.b.clean; const prevBox = S.cards[item.cid].box;
    item.answered = true;
    applyAnswer(item, clean, false); R.done++;
    const box = S.cards[item.cid].box;
    v.res = { up: box > prevBox, down: box < prevBox, mastered: box > prevBox && box === MASTERED_BOX };
    if (clean) { Audio.ding(R.combo); if (v.res.up) setTimeout(() => Audio.whoosh(), 200); if (v.res.mastered) { confetti(); Audio.fanfare(); } }
    else if (v.res.down) Audio.thud();
    render();
    setTimeout(() => Audio.speak(w.en), 250);
    // a clean build moves on by itself once the word has been spoken; after a miss he reads the word and taps on
    if (clean) Audio.afterSpeech(() => { if (R && R.current === item && view === 'card') nextCard(); }, v.res.mastered ? 2200 : 1500, 2600);
  }
  function tileScreen(item, header, progress, ladder) {
    const v = item.view, w = v.prompt, b = v.b; const text = id => b.tray.find(x => x.id === id).text;
    let k = 0;
    const slot = () => { const i = k++; const id = b.slots[i]; return `<button class="tslot ${id ? 'full' : ''} ${b.wrong.includes(i) ? 'wrong' : ''} ${b.solved ? 'ok' : ''}" data-action="t-slot" data-i="${i}">${id ? esc(text(id)) : ''}</button>`; };
    const slots = b.groups.map(word => `<span class="tword">${word.map(syl => `<span class="tsyl">${syl.split('').map(slot).join('')}</span>`).join('')}</span>`).join('');
    const tray = b.tray.map(x => { const used = b.slots.includes(x.id); return `<button class="ttile ${used ? 'used' : ''}" data-action="t-tile" data-id="${x.id}" ${used ? 'disabled' : ''}>${esc(x.text)}</button>`; }).join('');
    const hint = b.wrong.length ? t(b.wrong.length > 1 ? 'tileWrongN' : 'tileWrong1') : t(b.extra ? 'tileHintExtra' : 'tileHint');
    let below = `<div class="ttray en">${tray}</div>`;
    if (b.solved && b.clean) below = `<div class="feedback good"><span class="bigmark">✓</span><span class="en mid">${esc(w.en)}</span>${v.res.mastered ? `<span class="he big">${t('mastered')}</span>` : ''}</div>`;
    else if (b.solved) below = `<div class="feedback miss">
        <div class="row" style="justify-content:center; gap:18px"><span class="en mid">${esc(w.en)}</span><span class="he big">${esc(w.he)}</span></div>
        ${w.chunks !== w.en ? `<div class="chunks en center">${esc(w.chunks)}</div>` : ''}
        <div class="tip center">💡 ${esc(w.tip)}</div>
        <button class="btn primary" style="margin-top:10px" data-action="continue">${t('next')}</button>
      </div>`;
    return `
      ${header}
      ${progress}
      <div class="card question tcard" style="margin-top:14px">
        <div class="muted">${t('tileAsk')}</div>
        <div class="he big">${esc(w.he)}</div>
        <button class="btn speak" data-action="speak" data-text="${esc(w.en)}">🔊</button>
        <div class="tslots en">${slots}</div>
        ${b.solved ? '' : `<div class="muted">${hint}</div>`}
        <div style="position:absolute; top:14px; left:16px">${ladder}</div>
      </div>
      ${below}`;
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
    if (b.slots.includes(null)) { Audio.tick(); return render(); }
    // strict marking: every tile must be exact; the wrong ones are shown so the miss teaches
    const text = x => b.tray.find(k => k.id === x).text;
    b.wrong = b.slots.map((x, k) => text(x) === b.target[k] ? -1 : k).filter(k => k >= 0);
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
    const w = R.w, it = w.items[w.idx]; const sub = t('wCount', { i: w.idx + 1, n: w.items.length }); const pic = wPicture(it);
    const pair = it.be ? ['is', 'are'] : ['has', 'have'];
    if (w.stage === 'build') {
      const b = w.b; const text = id => b.tray.find(x => x.id === id).text;
      const slots = b.slots.map((id, i) => `<button class="wslot ${id ? 'full' : ''} ${b.wrong.includes(i) ? 'wrong' : ''} ${b.solved ? 'ok' : ''}" data-action="w-slot" data-i="${i}">${id ? esc(text(id)) : ''}</button>`).join('');
      const tray = b.tray.map(x => { const used = b.slots.includes(x.id); return `<button class="wtile ${used ? 'used' : ''}" data-action="w-tile" data-id="${x.id}" ${used || b.solved ? 'disabled' : ''}>${esc(x.text)}</button>`; }).join('');
      const hint = b.wrong.length ? t(b.wrong.length > 1 ? 'wWrongN' : 'wWrong1') : t(b.marks ? 'wHintMarks' : 'wHint');
      return `
        ${topbar(t('wBuildTitle'), sub)}
        <div class="card wcard">${pic}
          <div class="wslots en">${slots}${b.marks ? '' : '<span class="wdot">.</span>'}</div>
          ${b.solved ? '' : `<div class="muted center">${hint}</div>`}
        </div>
        ${b.solved
          ? `<div class="feedback good"><span class="bigmark">✓</span><button class="btn primary" data-action="w-built">${t(w.rung === 3 ? 'wToPen' : 'wNext')}</button></div>`
          : `<div class="wtray en">${tray}</div>`}`;
    }
    if (w.stage === 'copy') return `
        ${topbar(t('wCopyTitle'), sub)}
        <div class="card wcard">${pic}
          <div class="wmodel en">${esc(it.model)}</div>
          <div class="center">${t('wCopy')}</div>
          <div class="bigcta"><button class="btn primary block" data-action="w-pendown">${t('wPenDown')}</button></div>
        </div>`;
    if (w.stage === 'write') return `
        ${topbar(t('wWriteTitle'), sub)}
        <div class="card wcard">${pic}
          <div class="wbank en">${w.bank.map(x => `<span>${esc(x)}</span>`).join('')}</div>
          <div class="center">${t('wWrite', { a: pair[0], b: pair[1] })}</div>
          <div class="bigcta"><button class="btn primary block" data-action="w-pendown">${t('wPenDown')}</button></div>
        </div>`;
    return `
        ${topbar(t('wCheckTitle'), sub)}
        <div class="card wcard">
          <div class="wmodel en">${esc(it.model)}</div>
          <ol class="wchecks">
            <li>${t('wCheck1')}</li>
            <li>${t('wCheck2', { a: pair[0], b: pair[1] })}</li>
            <li>${t(w.rung >= 4 ? 'wCheck3Bank' : 'wCheck3Screen')}</li>
          </ol>
          <div class="center" style="font-size:26px; font-weight:700">${t('wHow')}</div>
          <div class="row wrap" style="justify-content:center; gap:14px">
            <button class="btn primary" data-action="w-ok">${t('wOk')}</button>
            <button class="btn" data-action="w-again">${t('wAgain')}</button>
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
  // the frame around a friend card is loot (cosmetic); a gold card keeps its glow inside any frame
  const friendCard = (p, gold) => { const fr = wornItem('frame'); return `<div class="fcard ${fr ? fr.css : ''} ${gold ? 'gold' : ''}"><div class="femoji">${p.friend.emoji}</div><div class="fname en">${esc(p.friend.name)}</div><div class="ffacts en">${p.friend.facts.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>`; };
  const friendChip = (p, gold) => `<div class="fchip ${gold ? 'gold' : ''}"><span>${p.friend.emoji}</span><b class="en">${esc(p.friend.name)}</b></div>`;
  const curQ = () => R.st.qs[R.st.qIdx];

  function startStory() {
    const pl = R.plan.story;
    if (!pl) return startReading();
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
    if (q.type === 'tf') st.opts = [{ id: 'T', label: L === 1 ? t('stTrue') : 'True', ok: q.ok === true }, { id: 'F', label: L === 1 ? t('stFalse') : 'False', ok: q.ok === false }];
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
        ${topbar(t(st.reread ? 'stRevisit' : 'stNew'), '')}
        <div class="card center spre">
          <div class="semoji">${p.emoji}</div>
          <div class="en big">${esc(p.title)}</div>
          ${L === 1 ? `<div class="sgist">${esc(p.gist)}</div>` : ''}
          <div class="skeys">${keys.map(w => `<button class="skey" data-action="speak" data-text="${esc(w.en)}"><span class="en">${esc(w.en)}</span><span>${esc(w.he)}</span></button>`).join('')}</div>
          <div class="bigcta"><button class="btn primary block" data-action="st-read">${t('stToStory')}</button></div>
        </div>`;
    }
    if (st.stage === 'end') {
      onRendered(() => { Audio.fanfare(); if (st.gold) confetti(60); });
      return `
        ${topbar(t(st.first ? 'stEndNew' : 'stEndRevisit'), '')}
        <div class="card center">
          <div class="sstars big">${st.results.map(r => r.star ? '⭐' : '☆').join(' ')}</div>
          ${friendCard(p, st.gold)}
          ${st.gold ? `<div class="muted">${t('stGold')}</div>` : ''}
          <div class="bigcta"><button class="btn primary block" data-action="st-done">${t('stContinue')}</button></div>
        </div>`;
    }
    const inQ = st.stage === 'q'; const q = inQ ? curQ() : null;
    const words = s => s.split(' ').map(tok => `<span class="w" data-action="st-word" data-w="${esc(tok)}">${esc(tok)}</span>`).join(' ');
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
        ${topbar(`${p.emoji} <span class="en">${esc(p.title)}</span>`, t(L === 1 ? 'stListen' : 'stTouch'))}
        ${passage}
        <div class="bigcta"><button class="btn primary block" data-action="st-toq" ${st.readDone ? '' : 'disabled'}>${t('stToQuestions')}</button></div>`;
    if (st.scrollEv) { st.scrollEv = false; onRendered(() => { const el = document.querySelector('.sline.ev'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); }
    const done = st.solved || st.revealed; const en = L > 1;
    const qtext = q.type === 'tf'
      ? `<div class="qlabel ${L === 3 ? 'en' : ''}">${L === 3 ? 'True or false?' : t('stTrueFalse')}</div><div class="qstmt en">${words(q.en)}</div>${L === 1 ? `<div class="she">${esc(q.he)}</div>` : ''}`
      : (L === 3 && q.en ? `<div class="qstmt en">${words(q.en)}</div>` : `<div class="qhe">${esc(q.he)}</div>`);
    const opts = st.opts.map(o => {
      const cls = done && o.ok ? 'good' : (st.off.includes(o.id) || (done && !o.ok) ? 'off' : (st.picked.includes(o.id) ? 'picked' : ''));
      return `<button class="qopt ${en ? 'en' : ''} ${cls}" data-action="st-pick" data-id="${o.id}" ${done || st.off.includes(o.id) ? 'disabled' : ''}>${esc(o.label)}</button>`;
    }).join('');
    const stars = st.qs.map((_, i) => i < st.results.length ? (st.results[i].star ? '⭐' : '☆') : '<span class="dot">•</span>').join('');
    return `
        ${topbar(`${p.emoji} <span class="en">${esc(p.title)}</span>`, t('stQCount', { i: st.qIdx + 1, n: st.qs.length }), `<span class="sstars">${stars}</span>`)}
        ${passage}
        <div class="card qcard">
          ${qtext}
          <div class="qopts ${q.type === 'tick2' ? 'col' : ''} ${en ? 'ltr' : ''}">${opts}</div>
          <div class="row wrap" style="justify-content:center; margin-top:12px">
            ${q.type === 'tick2' && !done ? `<button class="btn primary" data-action="st-check" ${st.picked.length === 2 ? '' : 'disabled'}>${t('stCheck')}</button>` : ''}
            ${!done ? `<button class="btn small" data-action="st-hint">${t('stHint')}</button>` : ''}
            ${st.revealed ? `<button class="btn primary" data-action="st-next">${t('stNext')}</button>` : ''}
          </div>
        </div>`;
  }

  // ---------- reading minute (PRD §6.3 item 5) ----------
  // Parent sessions only, after the writing and the story, and only when there is time left: it is the first
  // thing a long sitting drops. He reads three sentences aloud; the parent marks each one. The marks go to the
  // coach log and to nothing else: no box moves, no star, no sound that tells one mark from the other.
  const READING_MIN = 1.5;                                   // minutes it needs; with less than that left, it is skipped
  function readingPick() {
    const pool = C.readingPool || []; if (!pool.length) return [];
    const maxLand = Math.max(-1, ...S.landsIntroduced.map(l => l.id));
    const order = (C.units || []).map(u => u.id);
    const open = s => s.land <= maxLand && (!s.unit || packIntroduced(s.unit));
    const again = S.reading.again.map(id => pool.find(s => s.id === id)).filter(s => s && open(s));
    const rest = shuffle(pool.filter(s => open(s) && !again.includes(s)));
    const newness = s => s.land * 10 + (s.unit ? order.indexOf(s.unit) + 1 : 0);
    const unseen = rest.filter(s => !S.reading.seen[s.id]).sort((a, b) => newness(b) - newness(a));
    const seen = rest.filter(s => S.reading.seen[s.id]).sort((a, b) => S.reading.seen[a.id] - S.reading.seen[b.id]);
    // the ones marked "again" first, then one from the newest material, then anything not read yet
    const picks = again.slice(0, 3);
    if (picks.length < 3 && unseen.length) picks.push(unseen[0]);
    for (const s of [...shuffle(unseen.slice(1)), ...seen]) { if (picks.length >= 3) break; picks.push(s); }
    return picks;
  }
  function startReading() {
    if (R.mode !== 'parent' || minLeft() < READING_MIN) return finishSession();
    const items = readingPick(); if (!items.length) return finishSession();
    R.rd = { items: items.map(s => ({ id: s.id, en: s.en, mark: null })) };
    setPhase('reading'); view = 'reading'; render();
  }
  function rdMark(i, mark) { const it = R.rd.items[i]; it.mark = it.mark === mark ? null : mark; Audio.tick(); render(); }
  function rdDone(skip) {
    const rd = R.rd; if (!rd) return;
    if (!skip) {
      if (rd.items.some(x => !x.mark)) return;
      const items = rd.items.map(x => ({ id: x.id, en: x.en, ok: x.mark === 'ok' }));
      S.reading.again = items.filter(x => !x.ok).map(x => x.id);
      items.forEach(x => { S.reading.seen[x.id] = R.n; });
      S.reading.history.push({ date: todayStr(), n: R.n, items }); if (S.reading.history.length > 40) S.reading.history.shift();
      R.rdResult = { items }; logEvent('reading', { items }); save();
    }
    R.rd = null; finishSession();
  }
  function readingView() {
    const rd = R.rd; const all = rd.items.every(x => x.mark);
    return `
      ${topbar(t('rdTitle'), t('rdSub'), `<button class="btn small ghost" data-action="rd-skip">${t('rdSkip')}</button>`)}
      <div class="rdlist">${rd.items.map((x, i) => `
        <div class="card rdline">
          <div class="rdtext en">${esc(x.en)}</div>
          <div class="rdmarks">
            ${x.mark ? `<button class="sbtn" data-action="speak" data-text="${esc(x.en)}">🔊</button>` : ''}
            <button class="rdbtn ${x.mark === 'ok' ? 'on' : ''}" data-action="rd-mark" data-i="${i}" data-m="ok">✓</button>
            <button class="rdbtn ${x.mark === 'again' ? 'on' : ''}" data-action="rd-mark" data-i="${i}" data-m="again">🔁</button>
          </div>
        </div>`).join('')}</div>
      <div class="muted center rdnote">${t('rdParent')}</div>
      <div class="bigcta"><button class="btn primary block" data-action="rd-done" ${all ? '' : 'disabled'}>${t('rdDone')}</button></div>`;
  }

  // ---------- brag card (PRD §9.2 screen 8, CD5) ----------
  // A picture of the day's numbers, drawn on a canvas in the skin's colours, ready for the share sheet.
  // It shows what was done, never a level and never anyone else's numbers.
  let BR = null;            // { key, url, file }
  let bragFrom = 'map';
  const bragKey = () => { const rec = today().session; return rec ? `${todayStr()}|${rec.n}|${skinId()}|${JSON.stringify(S.loot.worn)}` : ''; };
  const bragReady = () => !!(BR && BR.key === bragKey());
  function bragTiles(rec) {
    const onMap = C.words.filter(w => S.cards[cardId(w.id, 'rec')]).length;
    const friends = Object.keys(S.story.done).filter(pid => STORY[pid]).length;
    const wrote = rec.writing ? rec.writing.items.length : 0;
    const st = streak(), won = masteredWordCount();
    return [
      { num: `${onMap}/50`, label: t('bragOnMap'), ok: onMap > 0 },
      { num: String(st), label: t('bragStreak'), ok: st >= 2 },
      { num: String(rec.correct), label: t('bragCorrect'), ok: rec.correct > 0 },
      { num: String(won), label: t('bragMastered'), ok: won > 0 },
      { num: String(friends), label: t('bragFriends'), ok: friends > 0 },
      { num: String(wrote), label: t('bragWrote'), ok: wrote > 0 },
      { num: String(rec.promoted), label: t('bragUp'), ok: rec.promoted > 0 },
    ].filter(x => x.ok).slice(0, 4);
  }
  function drawBrag(rec) {
    const W = 1080, H = 1350; const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d'); const cs = getComputedStyle(document.body); const v = name => cs.getPropertyValue(name).trim();
    const rgba = (hex, a) => { const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return hex; const n = parseInt(m[1], 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
    const disp = v('--display-font') || 'sans-serif', body = v('--he-font') || 'sans-serif';
    const emo = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    const circle = (cx, cy, r) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
    const box = (bx, by, bw, bh, r) => { x.beginPath(); x.moveTo(bx + r, by); x.arcTo(bx + bw, by, bx + bw, by + bh, r); x.arcTo(bx + bw, by + bh, bx, by + bh, r); x.arcTo(bx, by + bh, bx, by, r); x.arcTo(bx, by, bx + bw, by, r); x.closePath(); x.fill(); };
    const sk = skin(); const cx = W / 2;
    // the ground: the skin's sky or parchment, a glow behind the hero, and a scatter of specks
    x.fillStyle = v('--bg'); x.fillRect(0, 0, W, H);
    const glow = x.createRadialGradient(cx, 250, 40, cx, 250, 820); glow.addColorStop(0, rgba(v('--accent'), 0.38)); glow.addColorStop(1, rgba(v('--accent'), 0));
    x.fillStyle = glow; x.fillRect(0, 0, W, H);
    x.fillStyle = v('--fg');
    for (let i = 0; i < 110; i++) { x.globalAlpha = 0.06 + Math.random() * 0.22; circle(Math.random() * W, Math.random() * H, 1.5 + Math.random() * 3.5); }
    x.globalAlpha = 1;
    // the hero, wearing what he wears
    const cy = 262, r = 132; const aura = wornItem('aura');
    if (aura && aura.ring) {
      let ring = aura.ring[0];
      if (aura.ring.length > 1 && x.createConicGradient) { ring = x.createConicGradient(0, cx, cy); aura.ring.forEach((c, i) => ring.addColorStop(i / aura.ring.length, c)); ring.addColorStop(1, aura.ring[0]); }
      x.fillStyle = rgba(aura.ring[0], 0.28); circle(cx, cy, r + 40); x.fillStyle = ring; circle(cx, cy, r + 16);
    }
    x.fillStyle = v('--accent-deep'); circle(cx, cy + 12, r); x.fillStyle = v('--accent'); circle(cx, cy, r);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `150px ${emo}`; x.fillText(sk.icon, cx, cy + 10);
    const hat = wornItem('hat'), pal = wornItem('pal');
    if (hat) { x.font = `104px ${emo}`; x.fillText(hat.e, cx, cy - r + 4); }
    if (pal) { x.font = `104px ${emo}`; x.fillText(pal.e, cx + r + 24, cy + r - 44); }
    // who and which day
    x.direction = 'rtl';
    x.fillStyle = v('--fg'); x.font = `92px ${disp}`; x.fillText(S.hero.name, cx, 492);
    x.fillStyle = v('--fg-muted'); x.font = `600 36px ${body}`; x.fillText(`${sk.hero} · ${sk.name}`, cx, 566);
    const day = t('bragDay', { n: rec.n }); x.font = `62px ${disp}`; const dw = x.measureText(day).width + 96;
    x.fillStyle = v('--accent'); box(cx - dw / 2, 612, dw, 96, 48);
    x.fillStyle = v('--accent-ink'); x.fillText(day, cx, 662);
    // the day's numbers, right to left
    bragTiles(rec).forEach((tile, i) => {
      const tx = 550 - (i % 2) * 490, ty = 752 + Math.floor(i / 2) * 246;
      x.fillStyle = v('--card-edge'); box(tx, ty + 9, 470, 216, 42); x.fillStyle = v('--card-bg'); box(tx, ty, 470, 216, 42);
      x.direction = 'ltr'; x.fillStyle = v('--accent-deep'); x.font = `108px ${disp}`; x.fillText(tile.num, tx + 235, ty + 86);
      x.direction = 'rtl'; x.fillStyle = v('--ink-muted'); x.font = `600 34px ${body}`; x.fillText(tile.label, tx + 235, ty + 172);
    });
    x.fillStyle = v('--fg'); x.font = `600 40px ${body}`; x.fillText(t('bragFoot'), cx, 1272);
    x.fillStyle = v('--fg-muted'); x.font = `30px ${body}`; x.fillText(new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }), cx, 1320);
    return cv;
  }
  let bragBusy = '', bragWaiting = [];
  // `soon` = someone is looking at the empty frame; otherwise the drawing waits a moment, so it never
  // competes with the screen that asked for it.
  function prepareBrag(done, soon) {
    const rec = today().session; if (!rec || !S.hero) return;
    const key = bragKey(); if (bragReady()) { if (done) done(); return; }
    if (done) bragWaiting.push(done);
    if (bragBusy === key) return;                              // this very card is already being drawn
    bragBusy = key;
    const finish = () => { bragBusy = ''; const fns = bragWaiting; bragWaiting = []; if (bragReady()) fns.forEach(fn => fn()); };
    const draw = () => {
      try {
        // encoded on the spot (canvas.toBlob waits for an idle moment, which can be seconds away)
        const bin = atob(drawBrag(rec).toDataURL('image/jpeg', 0.92).split(',')[1]);
        const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        let file = null; try { file = new File([blob], `hey-day-${rec.n}.jpg`, { type: 'image/jpeg' }); } catch (e) { /* no File here: the picture can still be saved */ }
        if (BR && BR.url) URL.revokeObjectURL(BR.url);
        BR = { key, url: URL.createObjectURL(blob), file, n: rec.n };
      } catch (e) { /* no picture this time; the frame stays empty */ }
      finish();
    };
    // the title face may still be on its way; wait for it, but not for long
    const fam = getComputedStyle(document.body).getPropertyValue('--display-font');
    const go = () => setTimeout(draw, soon ? 0 : 350);
    if (document.fonts && document.fonts.load) Promise.race([document.fonts.load(`80px ${fam}`), new Promise(res => setTimeout(res, 1200))]).then(go, go); else go();
  }
  const canShareBrag = () => { try { return !!(bragReady() && BR.file && navigator.canShare && navigator.canShare({ files: [BR.file] })); } catch (e) { return false; } };
  function shareBrag() { if (!canShareBrag()) return; logEvent('brag', {}); try { navigator.share({ files: [BR.file] }).catch(() => {}); } catch (e) { /* the picture stays on screen */ } }
  function bragView() {
    if (!bragReady()) prepareBrag(() => { if (view === 'brag') render(); }, true);
    const ok = bragReady();
    return `
      ${topbar(t('bragTitle'), '', `<button class="btn small" data-action="brag-back">${t('back')}</button>`)}
      <div class="bragwrap">${ok ? `<img class="bragimg" src="${BR.url}" alt="">` : '<div class="bragimg wait"></div>'}</div>
      <div class="row wrap" style="justify-content:center">
        ${canShareBrag() ? `<button class="btn primary" data-action="brag-share">${t('bragShare')}</button>` : ''}
        ${ok ? `<a class="btn" href="${BR.url}" download="hey-day-${BR.n}.jpg">${t('bragSave')}</a>` : ''}
      </div>
      <div class="footer-note">${t('bragHold')}</div>`;
  }

  // ---------- the mystery box and the wardrobe (PRD §7.5, §7.6) ----------
  // What the close screen shows of today's finds: a closed box, then what was in it, then a short list.
  function lootCard(rec) {
    const sk = skin(); const all = rec.loot || [];
    const i = all.findIndex(d => !d.done && LOOT_ID[d.id]);
    if (i < 0) {
      const got = all.filter(d => LOOT_ID[d.id]); if (!got.length) return '';
      return `<div class="card lootcard found"><div class="row" style="justify-content:center; gap:22px">${avatar('lg')}<div class="lootlines"><div class="muted">${t('lootToday')}</div>${got.map(d => { const it = LOOT_ID[d.id]; return `<div class="lootline tier-${it.tier}"><span>${it.e}</span> ${esc(it.name)}</div>`; }).join('')}</div></div></div>`;
    }
    const d = all[i], it = LOOT_ID[d.id];
    if (!d.opened) {
      const tr = TERR.find(x => x.key === d.why);
      return `<div class="card lootcard ${tr ? 'flagged' : ''}">
          <div class="lootlabel">${tr ? `🚩 ${terrName(tr)}` : `${sk.boxIcon} ${sk.box}`}</div>
          ${tr ? `<div class="lootwhy">${t('boxFlag')}</div>` : ''}
          <button class="chest" data-action="box-open" data-i="${i}" aria-label="${esc(sk.box)}"><span class="rays"></span><span class="base"></span><span class="lid"></span><span class="lock">?</span></button>
          <div class="muted">${t('boxTap')}</div>
        </div>`;
    }
    return `<div class="card lootcard revealed tier-${it.tier}">
          <div class="tierchip">${t({ common: 'tierCommon', rare: 'tierRare', golden: 'tierGolden' }[it.tier])}</div>
          <div class="lootitem">${it.e}</div>
          <div class="lootname">${esc(it.name)}</div>
          <div class="row wrap" style="justify-content:center">
            <button class="btn primary" data-action="loot-use" data-i="${i}">${t('lootUse')}</button>
            <button class="btn" data-action="loot-later" data-i="${i}">${t('lootLater')}</button>
          </div>
        </div>`;
  }
  function openBox(i) {
    const rec = today().session; const d = rec && rec.loot && rec.loot[i]; const it = d && LOOT_ID[d.id];
    if (!it || d.opened) return;
    d.opened = true; save();                                  // it was his already; a reload must not close the box again
    const el = document.querySelector('.chest'); if (el) el.classList.add('opening');
    Audio.whoosh(); [0, 0.09, 0.18].forEach((when, k) => Audio.tone(300 + k * 90, 0.06, 'triangle', 0.06, when));
    setTimeout(() => {
      if (it.tier === 'golden') { Audio.fanfare(); confetti(90); } else if (it.tier === 'rare') Audio.fanfare(); else Audio.ding(4);
      if (view === 'close') render();
    }, 750);
  }
  function lootDone(i, use) {
    const rec = today().session; const d = rec && rec.loot && rec.loot[i]; const it = d && LOOT_ID[d.id]; if (!it) return;
    d.done = true;
    if (use) { S.loot.worn[it.slot] = it.id; S.loot.fresh = S.loot.fresh.filter(x => x !== it.id); previewLoot(it); }
    save(); render();
  }
  function wear(id) {
    const it = LOOT_ID[id]; if (!it || !owns(id)) return;
    if (S.loot.worn[it.slot] === id) delete S.loot.worn[it.slot]; else { S.loot.worn[it.slot] = id; previewLoot(it); }
    save(); render();
  }
  function wardrobeView() {
    const sk = skin(); const pool = lootPool();
    // what is still inside a closed box is his already, but it stays a "?" here until he opens the box
    const sealed = ((today().session || {}).loot || []).filter(d => !d.opened).map(d => d.id);
    const mine = it => owns(it.id) && !sealed.includes(it.id);
    const have = pool.filter(mine).length;
    const tile = it => mine(it)
      ? `<button class="litem tier-${it.tier} ${S.loot.worn[it.slot] === it.id ? 'on' : ''}" data-action="wear" data-id="${it.id}"><span class="le">${it.e}</span><span class="ln">${esc(it.name)}</span>${S.loot.fresh.includes(it.id) ? `<span class="lnew">${t('wardNew')}</span>` : ''}${S.loot.worn[it.slot] === it.id ? '<span class="lon">✓</span>' : ''}</button>`
      : `<div class="litem locked tier-${it.tier}"><span class="le">?</span></div>`;
    const rows = SLOTS.map(slot => {
      const items = pool.filter(i => i.slot === slot); if (!items.length) return '';
      return `<div class="wardrow"><div class="wardlabel">${sk[slot + 'Label'] || t('slot_' + slot)}</div><div class="litems">${items.map(tile).join('')}</div></div>`;
    }).join('');
    return `
      ${topbar(`${sk.wardrobeIcon} ${sk.wardrobe}`, t('wardSub', { n: have, total: pool.length }), `<button class="btn small" data-action="ward-close">${t('wardBack')}</button>`)}
      <div class="wardhero">${avatar('xl')}<div class="name">${esc(S.hero.name)}</div></div>
      ${rows}
      <div class="footer-note">${t('wardHint')}</div>`;
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
  const ranksRow = () => { const sk = skin(), bc = boxCounts(); return `<div class="ranks">${[1, 2, 3, 4, 5].map(b => `<div class="rank"><b>${bc[b]}</b><span>${sk.boxNames[b - 1]}</span></div>`).join('')}</div>`; };

  const VIEWS = {
    onboarding() {
      const sel = window.__skinSel || null; // nothing preselected: the choice is his
      return `
        <div class="topbar"><div><div class="title">${t('onbTitle')}</div><div class="sub">${t('onbSub')}</div></div></div>
        <div class="card">
          <p><b>${t('onbWhere')}</b></p>
          <div class="skins">
            ${Object.values(C.skins).map(s => `
              <button class="btn skin ${sel === s.id ? 'selected' : ''}" data-action="pick-skin" data-skin="${s.id}">
                <span class="icon">${s.icon}</span>
                <span><b>${s.name}</b><br><span class="muted" style="font-size:16px">${esc(s.blurb)}</span></span>
              </button>`).join('')}
          </div>
          <p style="margin-top:20px"><b>${t('onbName')}</b></p>
          <input class="text" id="heroName" maxlength="16" placeholder="${t('onbNameHint')}" value="${esc(window.__heroName || '')}">
          <div class="bigcta"><button class="btn primary block" data-action="finish-onboarding">${t('onbGo')}</button></div>
        </div>`;
    },

    map() {
      const sk = skin(); const done = todayDone();
      const capLeft = Math.max(0, S.settings.freePlayCapMin - Math.floor(today().freePlaySec / 60));
      const hasCards = Object.keys(S.cards).length > 0;
      settleStreak();
      const st = streak();
      // the week's freeze did its work while he was away: say so, once
      const yest = addDays(todayStr(), -1);
      if (S.streak.frozen[yest] && S.streak.told !== yest && st > 0) { S.streak.told = yest; save(); onRendered(() => toast(t('freezeTold'), 5000)); }
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
      // a territory that is open and not yet cleared shows the rare find that waits for its flag
      const dangle = tr => tr && terrOpen(tr) && !S.loot.cleared.includes(tr.key) ? '<span class="lootdot">🎁</span>' : '';
      const node = s => {
        if (s.kind === 'land') {
          const intro = landIntroduced(s.land.id); const p = landProgress(s.land);
          const isCurrent = !done && ((!intro && nextLand && nextLand.id === s.land.id) || (intro && p.pct < 100 && !nextLand));
          const cls = !intro ? 'locked' : (p.pct === 100 ? 'done' : '');
          return `<div class="node ${cls} ${isCurrent ? 'current' : ''} ${s.land.starter ? 'starter' : ''}" style="left:${s.x}%; top:${s.y}%">
            <div class="dot">${intro ? landIcon(s.land) : '🔒'}${p.pct === 100 ? '<span class="flag">🚩</span>' : ''}${dangle(TERR.find(x => x.land === s.land))}</div>
            <div class="label">${landName(s.land)}</div>
            <div class="stat">${intro ? `${p.mastered}/${p.total}` : t('mapWords', { n: s.land.words.length })}</div>
          </div>`;
        }
        if (s.kind === 'tower') {
          const p = towerProgress(s.g);
          const cls = !p.open ? 'locked' : (p.pct === 100 ? 'done' : '');
          return `<div class="node ${cls}" style="left:${s.x}%; top:${s.y}%"><div class="dot">${p.open ? sk.towerIcon : '🔒'}${p.open && p.pct === 100 ? '<span class="flag">🚩</span>' : ''}${dangle(TERR.find(x => x.g === s.g))}</div><div class="label">${sk.tower}</div><div class="stat en" style="letter-spacing:0">${p.open ? `${p.mastered}/${p.total}` : esc(s.g.short)}</div></div>`;
        }
        return `<div class="node locked boss" style="left:${s.x}%; top:${s.y}%"><div class="dot">${sk.bossIcon}</div><div class="label">${sk.boss}</div><div class="stat">${t('mapBossShut')}</div></div>`;
      };
      const road = smoothPath(stops.map(s => [s.x, s.y]));
      const roadLook = wornItem('road');                       // loot: the trail's colours
      const nl = nextLandForToday();
      const parentNow = done && parentExtras();
      const questLead = t(parentNow ? 'mapLeadParentToo' : (done ? 'mapLeadDone' : (hasCards ? 'mapLeadGo' : 'mapLeadFirst')));
      const newFriend = STORIES.some(x => !S.story.done[x.id]) && landIn(2, nl);
      const questParts = [dueCount ? (dueCount === 1 ? t('mapDueOne') : t('mapDue', { n: dueCount })) : '', nl ? (nl.starter ? sk.starterNew : t('mapNewLand')) : '', newFriend ? t('mapNewFriend') : ''].filter(Boolean);
      const questSub = done && !parentNow ? t('mapSubDone') : questParts.join(' · ');
      const friends = Object.entries(S.story.done).filter(([pid]) => STORY[pid]);
      const boxWaiting = done && (today().session.loot || []).some(d => !d.done && LOOT_ID[d.id]);
      const parentToo = done && parentExtras();
      return `
        <div class="topbar">
          <div class="hero" data-action="wardrobe">${avatar()}<div><div class="name">${esc(S.hero.name)}</div><div class="sub">${sk.hero} · ${sk.name}</div></div></div>
          <div class="row"><button class="pill" data-action="streak-info">🔥 ${st}${freezeLeft() ? '<span class="ice">🧊</span>' : ''}</button><span class="pill accent" id="coachTap">⭐ ${masteredWordCount()}/50</span></div>
        </div>
        <div class="card quest">
          <div><div class="lead">${questLead}</div><div class="muted">${questSub}</div></div>
          ${done
            ? `<div class="row wrap questbtns">
                ${boxWaiting ? `<button class="btn primary" data-action="to-close">${sk.boxIcon} ${t('mapBoxWaiting')}</button>` : ''}
                ${parentToo ? `<button class="btn ${boxWaiting ? '' : 'primary'}" data-action="mode" data-mode="parent">${t('mapParentToo')}</button>` : ''}
                <button class="btn ${capLeft > 0 && !boxWaiting && !parentToo ? 'primary' : ''}" data-action="practice" ${capLeft > 0 ? '' : 'disabled'}>${capLeft > 0 ? t('mapPractice', { n: capLeft }) : t('mapPracticeShut')}</button>
                <button class="btn" data-action="wardrobe">${sk.wardrobeIcon} ${sk.wardrobe}</button>
                <button class="btn" data-action="brag">${t('bragBtn')}</button>
              </div>`
            : `<button class="btn primary" data-action="start">${t('mapStart')}</button>`}
        </div>
        <div class="trail ${roadLook ? roadLook.css : ''}">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs><linearGradient id="roadRainbow" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="0"><stop offset="0" stop-color="#ff5d5d"/><stop offset="0.2" stop-color="#ffb13d"/><stop offset="0.4" stop-color="#f6e84a"/><stop offset="0.6" stop-color="#5fd66a"/><stop offset="0.8" stop-color="#4ac3f0"/><stop offset="1" stop-color="#a98bff"/></linearGradient></defs>
            <path class="road-glow" d="${road}"/><path class="road" d="${road}"${roadLook && roadLook.css === 'road-rainbow' ? ' style="stroke:url(#roadRainbow)"' : ''}/>
          </svg>
          ${stops.map(node).join('')}
        </div>
        ${ranksRow()}
        ${friends.length ? `<div class="friends">${friends.map(([pid, d]) => friendChip(STORY[pid], d.stars === d.total)).join('')}</div>` : ''}`;
    },

    modepick() {
      return `
        ${topbar(t('modeTitle'), t('modeSub'))}
        <div class="card" style="display:flex; flex-direction:column; gap:14px">
          <button class="btn primary block" style="min-height:90px" data-action="mode" data-mode="parent">${t('modeParent')}</button>
          <button class="btn block" style="min-height:90px" data-action="mode" data-mode="solo">${t('modeSolo')}</button>
          <button class="btn ghost small" data-action="to-map">${t('back')}</button>
        </div>`;
    },

    mission() {
      const items = [];
      if (R.reviewTotal) items.push(t('missionReview', { n: R.reviewTotal }));
      if (R.newLand) items.push(t('missionLand', { icon: landIcon(R.newLand), label: landNewLabel(R.newLand), name: landName(R.newLand), n: R.newLand.words.length }));
      const pl = R.plan;
      if (pl.unit) items.push(t('missionTower', { title: esc(pl.unit.title) }));
      if (pl.sd) items.push(t('missionSd'));
      if (pl.writing) items.push(t(pl.writing.paper ? 'missionPen' : 'missionTiles'));
      if (pl.story) items.push(pl.story.reread ? t('missionRevisit', { name: esc(pl.story.p.friend.name) }) : t('missionFriend'));
      if (R.mode === 'solo') items.push(t('missionCode'));
      return `
        ${topbar(t('missionTitle'), t('missionSub', { n: R.n }))}
        <div class="card">
          <ul style="font-size:22px; line-height:2">${items.map(x => `<li>${x}</li>`).join('')}</ul>
          <div class="bigcta"><button class="btn primary block" data-action="go">${t('missionGo')}</button></div>
        </div>`;
    },

    card() { return cardScreen(R, false); },
    practice() { return cardScreen(P, true); },

    // one screen with the rule, before a grammar unit's first cards
    pintro() {
      const sk = skin(); const u = R.pack.unit;
      return `
        ${topbar(`${sk.towerIcon} ${sk.tower}`, t('ruleSub'), '')}
        <div class="card rule">
          <div class="en big">${esc(u.title)}</div>
          <ul class="rulelines">${u.rule.map(l => `<li>${l}</li>`).join('')}</ul>
          ${u.trick ? `<div class="trick">💡 ${esc(u.trick)}</div>` : ''}
          <div class="examples">${u.examples.map(x => `<button class="exline en" data-action="speak" data-text="${esc(x)}">🔊 ${esc(x)}</button>`).join('')}</div>
          <div class="bigcta"><button class="btn primary block" data-action="pack-go">${t('ruleGo')}</button></div>
        </div>`;
    },

    writing() { return writingView(); },
    story() { return storyView(); },
    reading() { return readingView(); },

    intro() {
      const land = R.newLand; const wid = land.words[R.introIdx]; const w = WORDS[wid];
      onRendered(() => { if (S.settings.autoSpeak) Audio.speak(w.en); });
      return `
        ${topbar(landName(land), t('introCount', { i: R.introIdx + 1, n: land.words.length }), `<button class="btn small ghost" data-action="skip-intro">${t('introSkip')}</button>`)}
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
            <button class="btn primary" style="min-width:180px" data-action="intro-next">${t(R.introIdx + 1 < land.words.length ? 'introNext' : 'introGo')}</button>
          </div>
        </div>`;
    },

    close() {
      const sk = skin(); const rec = today().session;
      if (!rec) { view = 'map'; return VIEWS.map(); }
      // the fanfare and the counting-up happen once, when the quest ends; a redraw (the box opening) shows the numbers as they are
      const first = closeFx; closeFx = false;
      if (first) onRendered(() => { Audio.fanfare(); if (rec.mastered) confetti(90); });
      prepareBrag();                                           // drawn ahead, so the share sheet opens on the first tap
      const wrote = rec.writing && rec.writing.items.length ? rec.writing.items : null;
      const how = wrote ? t(wrote.some(x => x.paper) ? 'howPen' : 'howTiles') : '';
      const stat = (n, key) => `<div class="card stat"><div class="num"${first ? ` data-count="${n}">0` : `>${n}`}</div><div class="lbl">${t(key)}</div></div>`;
      return `
        ${topbar(t(rec.hardStop ? 'closeTitleStop' : 'closeTitle'), t('closeSub', { n: rec.n, m: minutes(rec.durationMs) }))}
        <div class="stats">
          ${stat(rec.correct, 'statCorrect')}${stat(rec.promoted, 'statUp')}${stat(masteredWordCount(), 'statMastered')}${stat(streak(), 'statStreak')}
        </div>
        ${rec.maxCombo >= 5 ? `<div class="card center">${t('closeCombo', { n: rec.maxCombo })}</div>` : ''}
        ${rec.story && STORY[rec.story.pid] ? `<div class="card center" style="margin-top:12px"><div class="muted">${t(rec.story.reread ? 'closeVisited' : 'closeNewFriend')}</div>${friendCard(STORY[rec.story.pid], rec.story.stars === rec.story.total)}</div>` : ''}
        ${wrote ? `<div class="card center" style="margin-top:12px">${wrote.length === 1 ? t('closeWroteOne', { how }) : t('closeWrote', { n: wrote.length, how })}</div>` : ''}
        ${rec.mode === 'solo' ? `<div class="card" style="margin-top:12px"><div class="center muted">${t('closeCode', { bossBare: sk.boss.replace(/^ה/, '') })}</div><div class="code">${rec.code}</div></div>` : ''}
        ${lootCard(rec)}
        ${ranksRow()}
        <div class="bigcta row">
          <button class="btn" data-action="brag">${t('bragBtn')}</button>
          <button class="btn primary grow" data-action="to-map">${t('closeMap')}</button>
        </div>`;
    },

    wardrobe() { return wardrobeView(); },
    brag() { return bragView(); },
    coach() { return coachScreen(); },
  };

  function cardScreen(rt, practice) {
    const item = rt.current; const v = item.view; const w = v.prompt; const g = v.g;
    const total = practice ? null : R.round.total;
    const progress = practice ? 0 : clamp(Math.round(100 * rt.done / Math.max(1, total)), 0, 100);
    const st = S.cards[item.cid];
    const header = practice
      ? topbar(t('practiceTitle'), '', `<button class="btn small" data-action="end-practice">${t('practiceEnd')}</button>`)
      : topbar(R.round.title, `${Math.min(rt.done, total)}/${total}${item.retry ? ' · 🔁' : ''}`, `<span class="combo ${rt.combo >= 5 ? 'hot' : ''}">${rt.combo >= 2 ? `x${rt.combo}` : ''}</span>`);
    const popAt = v.res && v.res.up ? st.box : 0;              // a tile card redraws after the answer; its new square pops
    const ladder = `<div class="boxladder" title="קופסה">${[1, 2, 3, 4, 5].map(b => `<span class="${b <= st.box ? (b === 5 ? 'top' : 'on') : ''} ${b === popAt ? 'pop' : ''}"></span>`).join('')}</div>`;
    const bar = practice ? '' : `<div class="progress"><div style="width:${progress}%"></div></div>`;
    if (v.kind === 'tile') return tileScreen(item, header, bar, ladder);

    let prompt = '', options = '', optCls = '';
    const optBtn = (o, label, cls) => `<button class="opt ${cls}" data-action="answer" data-id="${esc(o.id)}">${label}</button>`;
    if (v.kind === 'gc') {
      // grammar cloze: no audio before the answer (it would give the answer away); the whole sentence is spoken after
      const [a, b] = g.t.split('___');
      prompt = `<div class="muted">${t('askCloze')}</div><div class="en mid cloze">${esc(a)}<span class="blank" id="blank">&nbsp;</span>${esc(b)}</div>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join(''); optCls = v.options.length === 3 ? 'ltr three' : 'ltr';
    } else if (v.kind === 'np') {
      onRendered(() => { if (S.settings.autoSpeak) Audio.speak(g.en); });
      prompt = `<div class="muted">${t('askPronoun')}</div><div class="en big">${esc(g.en)}</div>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join(''); optCls = 'ltr';
    } else if (v.kind === 'sd') {
      prompt = g.pic ? `<div class="sdpic">${g.pic.map(e => `<span>${e}</span>`).join('')}</div>` : `<div class="sdlines en">${g.lines.map(l => `<div>${esc(l)}</div>`).join('')}</div>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join(''); optCls = 'ltr';
    } else if (v.kind === 'rec') {
      onRendered(() => { if (S.settings.autoSpeak) Audio.speak(w.en); });
      prompt = `<div class="muted">${t('askMeaning')}</div><div class="en big">${esc(w.en)}</div><button class="btn speak" data-action="speak" data-text="${esc(w.en)}">🔊</button>`;
      options = v.options.map(o => optBtn(o, esc(o.he), 'he')).join('');
    } else if (v.kind === 'lineup') {
      onRendered(() => Audio.speak(w.en));
      prompt = `<div class="muted">${t('askHeard')}</div><button class="btn speak" style="width:96px;height:96px;font-size:48px" data-action="speak" data-text="${esc(w.en)}">🔊</button>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join('');
    } else if (v.kind === 'img') {
      onRendered(() => { if (S.settings.autoSpeak) Audio.speak(w.en); });
      prompt = `<div class="muted">${t('askPicture')}</div><div class="en big">${esc(w.en)}</div><button class="btn speak" data-action="speak" data-text="${esc(w.en)}">🔊</button>`;
      options = v.options.map(o => optBtn(o, o.emoji, 'emoji')).join('');
    } else {
      prompt = `<div class="muted">${t('askWordForPicture')}</div><div style="font-size:96px; line-height:1.1">${w.emoji}</div>`;
      options = v.options.map(o => optBtn(o, esc(o.en), 'en')).join('');
    }
    return `
      ${header}
      ${bar}
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
    if (v.kind === 'tile') return;                            // tile cards answer through their tiles
    item.answered = true;
    const practice = !!P;
    const prevBox = S.cards[item.cid].box;
    const res = applyAnswer(item, correct, practice);
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
      const mastered = promoted && st.box === MASTERED_BOX;
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
        ${mastered ? `<span class="he big">${t('mastered')}</span>` : ''}
        ${res.born ? `<span class="bornchip">${t('tileBorn')}</span>` : ''}
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
        <button class="btn primary" style="margin-top:10px" data-action="continue">${t('next')}</button>
      </div>`;
    }
  }

  // The coach screen is for the parent. Its lines are written here, not in the kid's copy table.
  function coachScreen() {
    const sk = skin(); const bc = boxCounts(); const d = today();
    const sessions = Object.entries(S.days).filter(([, v]) => v.session).sort((a, b) => a[0] < b[0] ? 1 : -1);
    const tricky = Object.entries(S.cards).filter(([, st]) => st.misses >= 3).sort((a, b) => b[1].misses - a[1].misses).slice(0, 12);
    const lands = S.landsIntroduced.map(l => `${landName(C.lands.find(x => x.id === l.id) || { id: l.id })} (${l.date})`).join(', ') || 'עדיין לא';
    // M2: per-step log, grammar towers, writing track, story track
    const wr = S.writing, sto = S.story;
    const PHASE_HE = { review: 'חזרה', intro: 'היכרות', new: 'מילים חדשות', pintro: 'כלל', pack: 'דקדוק', writing: 'כתיבה', story: 'סיפור', reading: 'קריאה בקול' };
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
    // M2, the game half: reading minute, letter-tile cards, streak and freezes, loot
    const rRows = S.reading.history.slice(-5).reverse().map(h => h.items.map((r, i) => `<tr>${i === 0 ? `<td rowspan="${h.items.length}">${h.date}</td>` : ''}<td class="en">${esc(r.en)}</td><td>${r.ok ? '✓' : '🔁'}</td></tr>`).join('')).join('');
    const againEn = S.reading.again.map(id => (C.readingPool || []).find(s => s.id === id)).filter(Boolean).map(s => esc(s.en)).join(' ');
    const tiles = Object.keys(S.cards).filter(isTile);
    const fz = Object.entries(S.streak.frozen).sort((a, b) => a[0] < b[0] ? 1 : -1).slice(0, 6);
    const game = `
        <h3>דקת קריאה בקול</h3>
        ${rRows ? `<table><tr><th>מתי</th><th>משפט</th><th>סימון</th></tr>${rRows}</table>` : '<div class="muted">עוד לא הייתה. היא באה בסוף משימה עם הורה, ורק כשנשאר זמן.</div>'}
        ${againEn ? `<div>חוזרים בפעם הבאה: <span class="en">${againEn}</span></div>` : ''}
        <div class="muted">מסמנים ולא מתקנים באמצע המשפט. הסימונים נשמרים רק כאן; הם לא מזיזים קלפים ולא נראים במשחק.</div>
        <h3>קלפי בנייה מאותיות</h3>
        <div>${tiles.length} קלפים · ${tiles.filter(cid => S.cards[cid].box >= 4).length} בקופסה 4 ומעלה · עד ${TILE_CAP} במשימה</div>
        <div class="muted">קלף כזה נולד כשקלף המשמעות של המילה מגיע לקופסה 3.</div>
        <h3>רצף והקפאות</h3>
        <div>רצף: ${streak()} ימים · ההקפאה החינמית של השבוע: ${freezeLeft() ? 'עוד לא נוצלה' : 'נוצלה'}</div>
        ${fz.length ? `<div>ימים שהוקפאו: ${fz.map(([dt, k]) => `${dt} (${k === 'auto' ? 'אוטומטית' : 'מאמן'})`).join(', ')}</div>` : ''}
        <div class="row wrap"><button class="btn small" data-action="coach-freeze">🧊 להקפיא את הימים החסרים</button></div>
        <div class="muted">יום אחד בלי משימה בשבוע מוקפא לבד. הכפתור מיועד למחלה או לנסיעה: הוא מקפיא כל יום חסר מאז המשימה האחרונה, כולל היום.</div>
        <h3>שלל</h3>
        <div>${S.loot.owned.length} פריטים מתוך ${lootPool().length} · תיבות שנפתחו: ${S.loot.boxes.length}</div>
        <div class="row wrap"><button class="btn small" data-action="toggle-box">תיבה: ${(S.settings.boxEvery || 1) === 2 ? 'אחרי כל משימה שנייה' : 'אחרי כל משימה'}</button></div>
        <div class="muted">השלל קוסמטי בלבד ואינו משפיע על קלפים או על התקדמות. אם הוא שואל "מה מקבלים?" עוד לפני שהתחיל, כדאי לעבור לכל משימה שנייה.</div>`;
    return `
      ${topbar('מסך המאמן', 'להורים בלבד', `<button class="btn small" data-action="to-map">סגור</button>`)}
      <div class="card coach">
        <h3>הקופסאות (כל הקלפים: ${Object.keys(S.cards).filter(known).length})</h3>
        <div class="boxes">${[1, 2, 3, 4, 5].map(b => `<div><b>${bc[b]}</b>${b}· ${sk.boxNames[b - 1]}</div>`).join('')}</div>
        <h3>היום (${todayStr()})</h3>
        ${d.session ? `<div>משימה ${d.session.n} · ${d.session.mode === 'solo' ? 'לבד' : 'עם הורה'} · ${minutes(d.session.durationMs)} דק׳ · נכון ${d.session.correct} / טעויות ${d.session.wrong} · עלו ${d.session.promoted} / ירדו ${d.session.demoted}${d.session.hardStop ? ' · נעצר בזמן' : ''}${d.session.mode === 'solo' ? ` · <b>קוד: ${d.session.code}</b>` : ''}${d.session.mode === 'solo' && minutes(d.session.durationMs) < 4 && d.session.correct > 15 ? ' · ⚠️ מהר מדי?' : ''}</div>` : '<div class="muted">עדיין לא הייתה משימה היום</div>'}
        ${(d.earlier || []).map(e => `<div class="muted">קודם היום: משימה ${e.n} · ${e.mode === 'solo' ? 'לבד' : 'עם הורה'} · ${minutes(e.durationMs)} דק׳ · נכון ${e.correct} / טעויות ${e.wrong}${e.mode === 'solo' ? ` · קוד: ${e.code}` : ''}</div>`).join('')}
        ${steps ? `<div>לפי שלבים: ${steps}</div>` : ''}
        <div>מגרש האימונים היום: ${Math.floor(d.freePlaySec / 60)} דק׳ מתוך ${S.settings.freePlayCapMin}</div>
        <div>${sk.territoriesLabel} שנפתחו: ${lands}</div>
        ${m2}
        ${game}
        <h3>קלפים קשים (3+ טעויות)</h3>
        ${tricky.length ? `<table><tr><th>קלף</th><th>סוג</th><th>טעויות</th><th>קופסה</th></tr>${tricky.map(([cid, st]) => { const p = parseCard(cid); return `<tr><td class="en">${esc(cardLabel(cid))}</td><td>${{ rec: 'משמעות', lineup: 'שמיעה→קריאה', img: 'תמונה', tile: 'בנייה מאותיות', gc: 'דקדוק', np: 'כינוי גוף', sd: 'same / different' }[p.type] || p.type}</td><td>${st.misses}</td><td>${st.box}</td></tr>`; }).join('')}</table>` : '<div class="muted">אין עדיין</div>'}
        <h3>היסטוריה</h3>
        ${sessions.length ? `<table><tr><th>תאריך</th><th>#</th><th>מצב</th><th>נכון/טעות</th><th>עלו/ירדו</th><th>דק׳</th><th>קוד</th></tr>${sessions.flatMap(([date, v]) => daySessions(v).reverse().map(r => `<tr><td>${date}</td><td>${r.n}</td><td>${r.mode === 'solo' ? 'לבד' : 'הורה'}</td><td><bdi>${r.correct}</bdi>/<bdi>${r.wrong}</bdi></td><td><bdi>${r.promoted}</bdi>/<bdi>${r.demoted}</bdi></td><td>${minutes(r.durationMs)}</td><td class="en">${r.mode === 'solo' ? r.code : ''}</td></tr>`)).join('')}</table>` : '<div class="muted">אין עדיין</div>'}
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

  // "reset today" undoes today's quest, and with it what the quest gave: its loot and its reading marks
  function resetToday() {
    const dt = todayStr(); const d = S.days[dt]; if (!d || !d.session) return false;
    S.sessionCount = Math.max(0, S.sessionCount - daySessions(d).length); delete d.session; delete d.earlier;
    S.landsIntroduced = S.landsIntroduced.filter(l => l.date !== dt);
    S.packsIntroduced = S.packsIntroduced.filter(p => p.date !== dt);
    S.story.runs = S.story.runs.filter(r => r.date !== dt);
    const mine = S.loot.boxes.filter(b => b.date === dt); const ids = mine.map(b => b.id);
    S.loot.boxes = S.loot.boxes.filter(b => b.date !== dt);
    S.loot.owned = S.loot.owned.filter(id => !ids.includes(id));
    S.loot.fresh = S.loot.fresh.filter(id => !ids.includes(id));
    Object.keys(S.loot.worn).forEach(slot => { if (ids.includes(S.loot.worn[slot])) delete S.loot.worn[slot]; });
    S.loot.cleared = S.loot.cleared.filter(key => !mine.some(b => b.why === key));
    S.reading.history = S.reading.history.filter(h => h.date !== dt);
    save(); return true;
  }

  // ---------- actions ----------
  $app.addEventListener('click', e => {
    const a = e.target.closest('[data-action]'); if (!a) return;
    const act = a.dataset.action;
    switch (act) {
      case 'pick-skin': window.__skinSel = a.dataset.skin; window.__heroName = (document.getElementById('heroName') || {}).value || ''; Audio.whoosh(); render(); break;
      case 'finish-onboarding': {
        const name = ((document.getElementById('heroName') || {}).value || '').trim();
        if (!window.__skinSel) { toast(t('onbNeedSkin')); return; }
        if (!name) { toast(t('onbNeedName')); return; }
        S.hero = { name, skin: window.__skinSel, createdAt: Date.now() }; save(); logEvent('onboard', { skin: S.hero.skin });
        view = 'map'; render(); break;
      }
      case 'start': view = 'modepick'; render(); break;
      case 'mode': startSession(a.dataset.mode); break;
      case 'go': nextCard(); break;
      case 'speak': Audio.speak(a.dataset.text); break;
      case 'answer': handleAnswer(a.dataset.id); break;
      case 'continue': P ? nextPracticeCard() : nextCard(); break;
      case 't-tile': tilePlace(a.dataset.id); break;
      case 't-slot': tileUnplace(Number(a.dataset.i)); break;
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
      case 'st-done': R.st = null; startReading(); break;
      case 'rd-mark': rdMark(Number(a.dataset.i), a.dataset.m); break;
      case 'rd-done': rdDone(false); break;
      case 'rd-skip': rdDone(true); break;
      case 'box-open': openBox(Number(a.dataset.i)); break;
      case 'loot-use': lootDone(Number(a.dataset.i), true); break;
      case 'loot-later': lootDone(Number(a.dataset.i), false); break;
      // the wardrobe is part of the training grounds: it opens once the day's quest is done (PRD §7.7)
      case 'wardrobe': if (!todayDone()) { toast(t('wardLocked')); break; } view = 'wardrobe'; render(); break;
      case 'wear': wear(a.dataset.id); break;
      case 'ward-close': S.loot.fresh = []; save(); view = 'map'; render(); break;
      case 'streak-info': toast(t(freezeLeft() ? 'freezeInfo' : 'freezeUsed'), 5000); break;
      // one tap: the share sheet opens right away when the picture is ready; the card is also shown, to save or to send again
      case 'brag': if (!todayDone()) break; bragFrom = view === 'close' ? 'close' : 'map'; shareBrag(); view = 'brag'; render(); break;
      case 'brag-share': shareBrag(); break;
      case 'brag-back': view = bragFrom; render(); break;
      case 'to-close': view = 'close'; render(); break;
      case 'story-level': S.story.level = clamp(S.story.level + Number(a.dataset.d), 1, 3); S.story.clean = 0; save(); render(); break;
      case 'writing-rung': S.writing.rung = clamp(S.writing.rung + Number(a.dataset.d), 1, 4); S.writing.clean = 0; save(); render(); break;
      case 'coach-freeze': { const k = coachFreeze(); toast(k < 0 ? 'אין רצף להקפיא: לא הייתה משימה בשלושת השבועות האחרונים' : (k ? `הוקפאו ${k} ימים. הרצף נשמר.` : 'אין ימים חסרים')); render(); break; }
      case 'toggle-box': S.settings.boxEvery = (S.settings.boxEvery || 1) === 2 ? 1 : 2; save(); render(); break;
      case 'to-map': view = 'map'; render(); break;
      case 'practice': startPractice(); break;
      case 'end-practice': endPractice(false); break;
      case 'save-cap': { const v = parseInt(document.getElementById('capInput').value, 10); if (!isNaN(v)) { S.settings.freePlayCapMin = clamp(v, 0, 60); save(); toast('נשמר'); render(); } break; }
      case 'toggle-speak': S.settings.autoSpeak = !S.settings.autoSpeak; save(); render(); break;
      case 'change-pin': { const p = prompt('קוד חדש, 4 ספרות'); if (p && /^\d{4}$/.test(p.trim())) { S.settings.coachPin = p.trim(); save(); toast('הקוד הוחלף'); } else if (p !== null) toast('צריך 4 ספרות'); break; }
      case 'export': exportSave(); break;
      case 'import-show': document.getElementById('importBox').classList.toggle('hidden'); break;
      case 'import': importSave(document.getElementById('importText').value); break;
      case 'reset-today': if (confirm('לאפס את המשימה של היום? הקלפים שכבר זזו נשארים במקומם; רק אפשר יהיה לעשות משימה נוספת היום. השלל שנמצא היום חוזר לתיבה.')) { if (resetToday()) { toast('אופס'); render(); } } break;
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
    try { const s = JSON.parse(text); if (!s || s.version !== 1 || !s.cards) throw new Error('bad'); const pin = S.settings.coachPin; S = adopt(s); if (!S.settings.coachPin) S.settings.coachPin = pin; birthTiles(); save(); toast('השמירה נטענה'); view = 'map'; render(); }
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
  else birthTiles();
  render();

  // Expose for debugging in the browser console.
  window.__game = { get state() { return S; }, get session() { return R; }, get view() { return view; }, get brag() { return { ready: bragReady(), busy: bragBusy, waiting: bragWaiting.length, key: bragKey(), brKey: BR && BR.key }; }, save, render, Audio, startSession, startPractice, t, streak, settleStreak, grantLoot, readingPick, buildReviewQueue, drawBrag };
})();
