// Robust daily puzzle generator (overwrites files, rich 3-subclue schema)
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

// === BANK: add more entries over time ===
const BANK = [
  {
    master: "APPLE",
    difficulty: "easy",
    funFact: "There are over 7,500 varieties of apples grown worldwide.",
    subs: [
      { answer: "FRUIT", hints: ["red","green","sweet","pie","orchard"] },
      { answer: "TREE",  hints: ["branch","leaf","trunk","orchard","blossom"] },
      { answer: "SEED",  hints: ["core","plant","sprout","pit","germ"] }
    ]
  },
  {
    master: "BRIDGE",
    difficulty: "normal",
    funFact: "The Golden Gate Bridge was once the longest suspension bridge.",
    subs: [
      { answer: "RIVER",  hints: ["water","bank","flow","cross","current"] },
      { answer: "GAP",    hints: ["space","divide","span","break","separate"] },
      { answer: "CARD",   hints: ["deck","game","trick","bid","suit"] }
    ]
  },
  {
    master: "LIGHT",
    difficulty: "normal",
    funFact: "Light travels at ~299,792 km/s in vacuum.",
    subs: [
      { answer: "BULB",  hints: ["lamp","switch","socket","LED","filament"] },
      { answer: "SUN",   hints: ["day","shine","sky","bright","solar"] },
      { answer: "SPEED", hints: ["fast","c","vacuum","physics","Einstein"] }
    ]
  }
];

function pickFor(dateStr){
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
    master: { answer: base.master, aliases: [], funFact: base.funFact || "", learnMoreUrl: "" },
    subClues,
    difficulty: base.difficulty,
    version: 1
  };
}

function write(dateStr){
  const file = path.join(OUT_DIR, `${dateStr}.json`);
  const payload = pickFor(dateStr);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log('WROTE', file);
}

function main(){
  try {
    ensureDir(OUT_DIR);
    const now = new Date();
    const today = ymd(now);
    const tomorrow = ymd(new Date(now.getTime() + 24*60*60*1000));
    write(today);
    write(tomorrow);
    console.log('DONE generating puzzles.');
    process.exit(0);
  } catch (e) {
    console.error('GENERATOR ERROR:', e.stack || e.message);
    process.exit(1);
  }
}
main();
