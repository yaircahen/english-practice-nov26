// Content for the Hey! Unit 1 game. Plain data, no logic.
// wrong: true = marked × on the teacher's sheet (he got it wrong on the first pass).
// group: look-alike group used to pick Sound-lineup distractors.
// emoji: only for words a 10-year-old can match to a picture without ambiguity.
// tip: one-line Hebrew phonics hint, shown on a miss and in the intro.
// chunks: syllable display for first exposure and tricky words.

window.CONTENT = {
  words: [
    { id: 'age',        en: 'age',          he: 'גיל',          he2: '',               emoji: '',    chunks: 'age',               group: 'a',  tip: 'e שקטה בסוף: ה-a נשמעת "איי", ו-g לפני e נשמעת ג׳ → אֵייג׳', wrong: false },
    { id: 'also',       en: 'also',         he: 'גם',           he2: '',               emoji: '',    chunks: 'al·so',             group: 'a',  tip: 'al = "אוֹל" → אוֹלְסוֹ', wrong: true },
    { id: 'begin',      en: 'begin',        he: 'להתחיל',       he2: '',               emoji: '🏁',  chunks: 'be·gin',            group: 'b',  tip: 'בִּיגִין – ה-e הראשונה נשמעת "אִי"', wrong: false },
    { id: 'birthday',   en: 'birthday',     he: 'יום הולדת',    he2: '',               emoji: '🎂',  chunks: 'birth·day',         group: 'b',  tip: 'ir = "ֶר" → בֶּרְת׳דֵיי', wrong: false },
    { id: 'different',  en: 'different',    he: 'שונה',         he2: '',               emoji: '',    chunks: 'dif·fe·rent',       group: 'd',  tip: 'דִיפְרֶנְט – ה-e האמצעית כמעט לא נשמעת', wrong: false },
    { id: 'hobby',      en: 'hobby',        he: 'תחביב',        he2: '',               emoji: '🎨',  chunks: 'hob·by',            group: 'h',  tip: 'הוֹבִּי – y בסוף נשמעת "אִי"', wrong: false },
    { id: 'month',      en: 'month',        he: 'חודש',         he2: '',               emoji: '📅',  chunks: 'month',             group: 'm',  tip: 'th בסוף → מַאנְת׳', wrong: false },
    { id: 'pool',       en: 'pool',         he: 'בריכה',        he2: '',               emoji: '🏊',  chunks: 'pool',              group: 'p',  tip: 'oo = "אוּ" → פּוּל', wrong: false },
    { id: 'same',       en: 'same',         he: 'אותו הדבר',    he2: 'אותו, דומה',      emoji: '',    chunks: 'same',              group: 's',  tip: 'e שקטה בסוף: ה-a נשמעת "איי" → סֵיים', wrong: false },
    { id: 'year',       en: 'year',         he: 'שנה',          he2: '',               emoji: '🗓️', chunks: 'year',              group: 'y',  tip: 'ea כאן = "יִי" → יִיר', wrong: false },
    { id: 'a-lot-of',   en: 'a lot of',     he: 'הרבה',         he2: '',               emoji: '',    chunks: 'a · lot · of',      group: 'a',  tip: 'שלוש מילים קטנות: אֶ לוֹט אוֹב', wrong: false },
    { id: 'chess',      en: 'chess',        he: 'שחמט',         he2: '',               emoji: '♟️',  chunks: 'chess',             group: 'c',  tip: 'ch = צ׳ → צֶ׳ס', wrong: false },
    { id: 'first',      en: 'first',        he: 'ראשון',        he2: '',               emoji: '🥇',  chunks: 'first',             group: 'f',  tip: 'ir = "ֶר" → פֶרְסְט', wrong: false },
    { id: 'important',  en: 'important',    he: 'חשוב',         he2: '',               emoji: '',    chunks: 'im·por·tant',       group: 'i',  tip: 'or = "אוֹר" → אִימְפּוֹרְטֶנְט', wrong: true },
    { id: 'learn',      en: 'learn',        he: 'ללמוד',        he2: '',               emoji: '📚',  chunks: 'learn',             group: 'l',  tip: 'ear כאן = "ֶר" → לֶרְן (יוצא דופן)', wrong: true },
    { id: 'old',        en: 'old',          he: 'זקן',          he2: 'ישן; בן (גיל): How old are you?', emoji: '👴', chunks: 'old', group: 'o', tip: 'o ארוכה → אוֹלְד', wrong: true },
    { id: 'people',     en: 'people',       he: 'אנשים',        he2: '',               emoji: '👨‍👩‍👧‍👦', chunks: 'peo·ple',       group: 'p',  tip: 'eo = "אִי" → פִּיפֶּל (מילה מוזרה, לזכור בעל פה)', wrong: true },
    { id: 'special',    en: 'special',      he: 'מיוחד',        he2: '',               emoji: '',    chunks: 'spe·cial',          group: 's',  tip: 'ci = "שׁ" → סְפֶּשֶל', wrong: true },
    { id: 'together',   en: 'together',     he: 'ביחד',         he2: '',               emoji: '🤝',  chunks: 'to·ge·ther',        group: 't',  tip: 'th = לשון בין השיניים → טוּגֶדֶ׳ר', wrong: false },
    { id: 'win',        en: 'win',          he: 'לנצח',         he2: '',               emoji: '🏆',  chunks: 'win',               group: 'w',  tip: 'i קצרה → וִוין', wrong: false },
    { id: 'but',        en: 'but',          he: 'אבל',          he2: '',               emoji: '',    chunks: 'but',               group: 'b',  tip: 'u קצרה → בַּאט', wrong: true },
    { id: 'fast',       en: 'fast',         he: 'מהר',          he2: 'מהיר',            emoji: '🏎️', chunks: 'fast',              group: 'f',  tip: 'פַאסְט', wrong: true },
    { id: 'hard',       en: 'hard',         he: 'קשה',          he2: '',               emoji: '',    chunks: 'hard',              group: 'h',  tip: 'ar = "אַר" → הַארְד', wrong: true },
    { id: 'help',       en: 'help',         he: 'לעזור',        he2: 'עזרה',            emoji: '🆘',  chunks: 'help',              group: 'h',  tip: 'הֶלְפּ', wrong: false },
    { id: 'if',         en: 'if',           he: 'אם',           he2: '',               emoji: '',    chunks: 'if',                group: 'i',  tip: 'אִיף', wrong: true },
    { id: 'young',      en: 'young',        he: 'צעיר',         he2: '',               emoji: '👶',  chunks: 'young',             group: 'y',  tip: 'ou כאן = "אַ" → יַאנְג', wrong: false },
    { id: 'best',       en: 'best',         he: 'הכי טוב',      he2: '',               emoji: '',    chunks: 'best',              group: 'b',  tip: 'בֶּסְט', wrong: true },
    { id: 'better',     en: 'better',       he: 'יותר טוב',     he2: '',               emoji: '',    chunks: 'bet·ter',           group: 'b',  tip: 'er בסוף = "ֶר" → בֶּטֶר', wrong: false },
    { id: 'call',       en: 'call',         he: 'לקרוא',        he2: 'להתקשר; לקרוא ל-', emoji: '📞', chunks: 'call',              group: 'c',  tip: 'all = "אוֹל" → קוֹל', wrong: false },
    { id: 'choose',     en: 'choose',       he: 'לבחור',        he2: '',               emoji: '👉',  chunks: 'choose',            group: 'c',  tip: 'oo = "אוּ", ה-e שקטה → צ׳וּז', wrong: false },
    { id: 'information',en: 'information',  he: 'מידע',         he2: '',               emoji: 'ℹ️',  chunks: 'in·for·ma·tion',    group: 'i',  tip: 'tion = "שֶן" → אִינְפוֹרְמֵיישֶן', wrong: false },
    { id: 'more',       en: 'more',         he: 'יותר / עוד',   he2: '',               emoji: '',    chunks: 'more',              group: 'm',  tip: 'ore = "אוֹר" → מוֹר', wrong: true },
    { id: 'next',       en: 'next',         he: 'הבא',          he2: '',               emoji: '',    chunks: 'next',              group: 'n',  tip: 'נֶקְסְט', wrong: false },
    { id: 'wait-for',   en: 'wait for',     he: 'לחכות ל-',     he2: '',               emoji: '⏳',  chunks: 'wait · for',        group: 'w',  tip: 'ai = "אֵיי" → וֵייט', wrong: true },
    { id: 'blanket',    en: 'blanket',      he: 'שמיכה',        he2: '',               emoji: '🛏️', chunks: 'blan·ket',          group: 'b',  tip: 'בְּלַנְקֶט', wrong: true },
    { id: 'brush',      en: 'brush',        he: 'מברשת',        he2: 'לצחצח',           emoji: '🪥',  chunks: 'brush',             group: 'b',  tip: 'sh = שׁ → בְּרַאשׁ', wrong: true },
    { id: 'every',      en: 'every',        he: 'כל',           he2: '',               emoji: '',    chunks: 'ev·ery',            group: 'e',  tip: 'אֶבְרִי', wrong: true },
    { id: 'give',       en: 'give',         he: 'לתת',          he2: '',               emoji: '🎁',  chunks: 'give',              group: 'g',  tip: 'e שקטה, אבל ה-i נשארת קצרה: גִיב (יוצא דופן)', wrong: false },
    { id: 'put',        en: 'put',          he: 'לשים',         he2: '',               emoji: '📥',  chunks: 'put',               group: 'p',  tip: 'u כאן = "אוּ" קצרה → פּוּט', wrong: true },
    { id: 'take-care-of',en: 'take care of', he: 'לטפל ב-',      he2: '',               emoji: '🩹',  chunks: 'take · care · of',  group: 't',  tip: 'e שקטה פעמיים: טֵייק קֵר', wrong: true },
    { id: 'time',       en: 'time',         he: 'זמן',          he2: 'פעם',             emoji: '⏰',  chunks: 'time',              group: 't',  tip: 'e שקטה: ה-i נשמעת "איי" → טַיים', wrong: true },
    { id: 'toy',        en: 'toy',          he: 'צעצוע',        he2: '',               emoji: '🧸',  chunks: 'toy',               group: 't',  tip: 'oy = "אוֹי" → טוֹי', wrong: false },
    { id: 'wash',       en: 'wash',         he: 'לשטוף',        he2: 'לרחוץ',           emoji: '🧼',  chunks: 'wash',              group: 'w',  tip: 'a אחרי w נשמעת "אוֹ" → ווֹשׁ', wrong: true },
    { id: 'with',       en: 'with',         he: 'עם',           he2: '',               emoji: '',    chunks: 'with',              group: 'w',  tip: 'th בסוף → וִוידׄ׳', wrong: false },
    { id: 'always',     en: 'always',       he: 'תמיד',         he2: '',               emoji: '',    chunks: 'al·ways',           group: 'a',  tip: 'al = "אוֹל" → אוֹלְוֵויז', wrong: true },
    { id: 'like',       en: 'like',         he: 'לאהוב',        he2: 'כמו',             emoji: '❤️',  chunks: 'like',              group: 'l',  tip: 'e שקטה: ה-i נשמעת "איי" → לַייק', wrong: false },
    { id: 'other',      en: 'other',        he: 'אחר',          he2: '',               emoji: '',    chunks: 'o·ther',            group: 'o',  tip: 'th → אַדֶ׳ר', wrong: true },
    { id: 'team',       en: 'team',         he: 'קבוצה',        he2: '',               emoji: '⚽',  chunks: 'team',              group: 't',  tip: 'ea = "אִי" ארוכה → טִים', wrong: true },
    { id: 'because',    en: 'because',      he: 'בגלל ש-',      he2: 'כי',              emoji: '',    chunks: 'be·cause',          group: 'b',  tip: 'au = "אוֹ" → בִּיקוֹז', wrong: true },
    { id: 'break',      en: 'break',        he: 'לשבור',        he2: 'הפסקה',           emoji: '💔',  chunks: 'break',             group: 'b',  tip: 'ea כאן = "אֵיי" → בְּרֵייק (יוצא דופן!)', wrong: true },
  ],

  // Starter kit (land 0, day 0): pronouns and question words as sight words. Not counted in the 50.
  starter: [
    { id: 'i',       en: 'I',       he: 'אני',        he2: '', emoji: '🙋', chunks: 'I',       group: 'pr', tip: 'איי. תמיד באות גדולה, גם באמצע משפט', starter: true },
    { id: 'you',     en: 'you',     he: 'אתה / את',   he2: 'אתם / אתן', emoji: '👉', chunks: 'you',     group: 'pr', tip: 'יוּ', starter: true },
    { id: 'he',      en: 'he',      he: 'הוא',        he2: '', emoji: '👦', chunks: 'he',      group: 'pr', tip: 'הִי', starter: true },
    { id: 'she',     en: 'she',     he: 'היא',        he2: '', emoji: '👧', chunks: 'she',     group: 'pr', tip: 'sh = שׁ → שִׁי', starter: true },
    { id: 'it',      en: 'it',      he: 'זה',         he2: 'חפץ או חיה', emoji: '📦', chunks: 'it',      group: 'pr', tip: 'אִיט', starter: true },
    { id: 'we',      en: 'we',      he: 'אנחנו',      he2: '', emoji: '',   chunks: 'we',      group: 'pr', tip: 'וִוי', starter: true },
    { id: 'they',    en: 'they',    he: 'הם / הן',    he2: '', emoji: '',   chunks: 'they',    group: 'pr', tip: 'th = לשון בין השיניים → דֵ׳יי', starter: true },
    { id: 'what',    en: 'What',    he: 'מה',         he2: '', emoji: '❓', chunks: 'What',    group: 'wh', tip: 'wh = וו → ווֹט', starter: true },
    { id: 'where',   en: 'Where',   he: 'איפה',       he2: '', emoji: '📍', chunks: 'Where',   group: 'wh', tip: 'וֶור', starter: true },
    { id: 'who',     en: 'Who',     he: 'מי',         he2: '', emoji: '👤', chunks: 'Who',     group: 'wh', tip: 'ה-w שקטה! → הוּ', starter: true },
    { id: 'when',    en: 'When',    he: 'מתי',        he2: '', emoji: '⏰', chunks: 'When',    group: 'wh', tip: 'וֶון', starter: true },
    { id: 'why',     en: 'Why',     he: 'למה',        he2: '', emoji: '🤔', chunks: 'Why',     group: 'wh', tip: 'וַויי', starter: true },
    { id: 'how-old', en: 'How old', he: 'בן כמה',     he2: 'How old are you? = בן כמה אתה?', emoji: '🎂', chunks: 'How · old', group: 'h', tip: 'הַאוּ אוֹלְד', starter: true },
  ],

  // Land 0 = starter kit. Then five lands of ten: × words first (lands 1, 2 and half of 3), known words last.
  lands: [
    { id: 0, starter: true, words: ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'where', 'who', 'when', 'why', 'how-old'] },
    { id: 1, words: ['blanket', 'brush', 'wash', 'put', 'team', 'people', 'old', 'time', 'fast', 'hard'] },
    { id: 2, words: ['also', 'but', 'if', 'because', 'every', 'always', 'other', 'more', 'important', 'special'] },
    { id: 3, words: ['wait-for', 'take-care-of', 'learn', 'best', 'break', 'age', 'year', 'month', 'birthday', 'young'] },
    { id: 4, words: ['begin', 'different', 'hobby', 'pool', 'same', 'a-lot-of', 'chess', 'first', 'together', 'win'] },
    { id: 5, words: ['help', 'better', 'call', 'choose', 'information', 'next', 'give', 'toy', 'with', 'like'] },
  ],

  // Grammar towers arrive in M2. Listed so the map can show them locked.
  grammar: [
    { id: 'g1', title: 'כינויי גוף + to be', short: 'am · is · are', sub: 'I am, he is, they are' },
    { id: 'g2', title: 'to be: שלילה ושאלות', short: 'שאלות', sub: "isn't, Are you…? Yes, I am." },
    { id: 'g3', title: 'שאלות Wh', short: 'What · Who', sub: 'What, Where, Who, How old' },
    { id: 'g4', title: 'have / has, a / an / some', short: 'have · has', sub: 'She has a toy' },
  ],

  // Three skins. Same mechanics, different words and pictures.
  skins: {
    map: {
      id: 'map', name: 'כיבוש המפה', icon: '🏰', hero: 'מצביא', blurb: 'חמש ממלכות. אף אחת לא תיכנע מרצון.',
      territory: 'ממלכה', newTerritory: 'ממלכה חדשה', territoriesLabel: 'ממלכות', names: ['ממלכת היער', 'ממלכת ההרים', 'ממלכת הנהר', 'ממלכת המדבר', 'ממלכת החוף'],
      starterName: 'המחנה', starterIcon: '⛺', starterNew: 'ציוד למסע',
      tower: 'מגדל', boss: 'המבחן הגדול', bossIcon: '🐉',
      boxNames: ['גיוס', 'חייל', 'אביר', 'שר', 'מלך'],
      terrIcons: ['🌲', '⛰️', '🏞️', '🏜️', '🏖️'],
      accent: '#2f6f4e',
    },
    space: {
      id: 'space', name: 'משימת חלל', icon: '🚀', hero: 'קפטן', blurb: 'חמישה כוכבים. בקרת המשימה מבקשת לא לגעת בכפתור האדום.',
      territory: 'כוכב', newTerritory: 'כוכב חדש', territoriesLabel: 'כוכבים', names: ['הירח', 'מאדים', 'צדק', 'שבתאי', 'נפטון'],
      starterName: 'תחנת השיגור', starterIcon: '🛰️', starterNew: 'ציוד לטיסה',
      tower: 'תחנה', boss: 'הנחיתה הגדולה', bossIcon: '🛸',
      boxNames: ['טירון', 'טייס', 'נווט', 'קפטן', 'אגדה'],
      terrIcons: ['🌙', '🔴', '🪐', '💫', '🔵'],
      accent: '#2b4c7e',
    },
    wizard: {
      id: 'wizard', name: 'שוליית הקוסם', icon: '🧙', hero: 'קוסם', blurb: '50 לחשים ללמוד, ודרקון אחד שלא קרא את הספר.',
      territory: 'ארץ', newTerritory: 'ארץ חדשה', territoriesLabel: 'ארצות', names: ['ארץ המערות', 'ארץ הביצות', 'היער הקסום', 'ארץ המצודה', 'ארץ העננים'],
      starterName: 'ערכת הקוסם', starterIcon: '🪄', starterNew: 'השרביט והגלימה',
      tower: 'מגדל קסמים', boss: 'הדרקון', bossIcon: '🐲',
      boxNames: ['מגילה', 'שוליה', 'מיומן', 'אמן', 'ספר הקסמים'],
      terrIcons: ['🕯️', '🐸', '🌳', '🏯', '☁️'],
      accent: '#5b3a8a',
    },
  },

  // Leitner: sessions between reviews, by box. Box 5 is "mastered": only spot-checked (M3).
  intervals: { 1: 1, 2: 2, 3: 4, 4: 7, 5: Infinity },
  sessionHardStopMin: 16,
  freePlayCapMinDefault: 15,
  reviewStackCap: 24,
};
