// Hybrid daily puzzle generator:
// - Generates today + next 34 days
// - For each missing date: tries OpenAI -> fallback BANK
// - Writes rich schema used by the site
//
// Env: OPENAI_API_KEY optional (if absent, uses BANK only)

const fs = require('fs');
const path = require('path');

const TZ = 'Europe/Zagreb';
const OUT_DIR = path.join(process.cwd(), 'puzzles');

function ymd(d) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d);
}
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// --- Curated fallback BANK (add more over time) ---
const BANK = [
  { master: "APPLE", fact: "There are over 7,500 cultivated apple varieties worldwide.",
    subs: [
      { answer: "FRUIT", hints: ["red","green","sweet","orchard","pie"] },
      { answer: "TREE",  hints: ["branch","leaf","trunk","orchard","blossom"] },
      { answer: "SEED",  hints: ["core","plant","sprout","pit","germ"] }
    ], difficulty: "easy" },
  { master: "BRIDGE", fact: "The Golden Gate Bridge opened in 1937.",
    subs: [
      { answer: "RIVER",  hints: ["water","bank","flow","cross","current"] },
      { answer: "GAP",    hints: ["space","divide","span","break","separate"] },
      { answer: "CARD",   hints: ["deck","game","trick","bid","suit"] }
    ], difficulty: "normal" },
  // ... (keep the rest of the BANK you already pasted earlier)
];

function bankFor(dateStr){
  // deterministic pick by date (so re-runs are stable)
  const idx = Math.abs([...dateStr].reduce((a,c)=>a + c.charCodeAt(0),0)) % BANK.length;
  const base = BANK[idx];
  const subClues = base.subs.map((sc, i) => ({
    id: String.fromCharCode(65 + i),
    answer: sc.answer,
    aliases: [],
    hints: sc.hints
  }));
  return {
    date: dateStr,
    master: { answer: base.master, aliases: [], funFact: base.fact || "", learnMoreUrl: "" },
    subClues,
    difficulty: base.difficulty || "normal",
    version: 1
  };
}

async function maybeOpenAI(dateStr){
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // lazy import to avoid requiring openai when not installed locally
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey });

  const prompt = `
You generate ONE puzzle as JSON ONLY (no markdown, no comments) in this exact rich schema:

{
  "date": "YYYY-MM-DD",
  "master": { "answer": "STRING(3-12)", "aliases": [], "funFact": "short accurate fact", "learnMoreUrl": "" },
  "subClues": [
    { "id": "A", "answer": "WORD_OR_SHORT_PHRASE", "aliases": [], "hints": ["hint1","hint2","hint3","hint4","hint5"] },
    { "id": "B", "answer": "WORD_OR_SHORT_PHRASE", "aliases": [], "hints": ["hint1","hint2","hint3","hint4","hint5"] },
    { "id": "C", "answer": "WORD_OR_SHORT_PHRASE", "aliases": [], "hints": ["hint1","hint2","hint3","hint4","hint5"] }
  ],
  "difficulty": "easy|normal|hard",
  "version": 1
}

Rules:
- Mixed themes (like Wordle); no proper-noun obscurities unless widely known.
- Hints must be indirect and not equal to the answers.
- Fun fact must be true and concise (1 sentence).
- Keep simple ASCII (no quotes that would break JSON).
- Use this exact date: ${dateStr}.
`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }]
  });

  const txt = (resp.choices?.[0]?.message?.content || '').trim();
  // Hard parse; if invalid JSON or missing fields, we reject so fallback kicks in.
  let obj;
  try { obj = JSON.parse(txt); } catch { return null; }

  // Minimal validation (the full validator will run in CI)
  if (!obj || !obj.master || !obj.subClues || !Array.isArray(obj.subClues) || obj.subClues.length < 3) {
    return null;
  }
  // Normalize a bit: ensure ids A/B/C and arrays present
  obj.date = dateStr;
  obj.master.aliases = Array.isArray(obj.master.aliases) ? obj.master.aliases : [];
  obj.master.learnMoreUrl = obj.master.learnMoreUrl || "";
  obj.difficulty = obj.difficulty || "normal";
  obj.version = 1;
  obj.subClues = obj.subClues.slice(0,3).map((sc, i) => ({
    id: ['A','B','C'][i],
    answer: String(sc.answer || '').trim(),
    aliases: Array.isArray(sc.aliases) ? sc.aliases : [],
    hints: Array.isArray(sc.hints) ? sc.hints.map(h=>String(h)) : []
  }));

  // Basic sanity: hints not identical to answers (case-insensitive)
  for (const sc of obj.subClues) {
    sc.hints = sc.hints.filter(h => h && h.toLowerCase().trim() !== sc.answer.toLowerCase().trim());
    if (sc.hints.length === 0) sc.hints = ["clue","related","association","context","concept"];
  }

  return obj;
}

async function writeOne(dateStr){
  const file = path.join(OUT_DIR, `${dateStr}.json`);
  if (fs.existsSync(file)) {
    console.log('SKIP (exists):', file);
    return;
  }
  // Try GPT
  let payload = null;
  try {
    payload = await maybeOpenAI(dateStr);
    if (payload) {
      fs.writeFileSync(file, JSON.stringify(payload, null, 2));
      console.log('WROTE (GPT):', file);
      return;
    }
  } catch (e) {
    console.warn('OpenAI generation failed, falling back. Reason:', e.message);
  }
  // Fallback to BANK
  const bank = bankFor(dateStr);
  fs.writeFileSync(file, JSON.stringify(bank, null, 2));
  console.log('WROTE (BANK):', file);
}

async function main(){
  try {
    ensureDir(OUT_DIR);
    const now = new Date();
    // today + next 34 days (35 files)
    for (let offset = 0; offset <= 34; offset++) {
      const d = new Date(now.getTime() + offset*24*60*60*1000);
      const dateStr = ymd(d);
      // eslint-disable-next-line no-await-in-loop
      await writeOne(dateStr);
    }
    console.log('DONE generating up to 35 days.');
    process.exit(0);
  } catch (e) {
    console.error('GENERATOR ERROR:', e.stack || e.message);
    process.exit(1);
  }
}
main();
