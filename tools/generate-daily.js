// Proper daily puzzle generator (no API). Writes today's and tomorrow's files
// in the rich schema used by the game:
//
// {
//   "date": "YYYY-MM-DD",
//   "master": { "answer": "APPLE", "aliases": [], "funFact": "", "learnMoreUrl": "" },
//   "subClues": [
//     { "id": "A", "answer": "FRUIT", "aliases": [], "hints": ["red","green","sweet","pie","orchard"] },
//     { "id": "B", "answer": "TREE",  "aliases": [], "hints": ["branch","leaf","trunk","orchard","blossom"] },
//     { "id": "C", "answer": "SEED",  "aliases": [], "hints": ["core","plant","sprout","pit","germ"] }
//   ],
//   "difficulty": "normal",
//   "version": 1
// }

const fs = require('fs');
const path = require('path');

const TZ = 'Europe/Zagreb';
const OUT_DIR = path.join(process.cwd(), 'puzzles');

function ymd(d){ 
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(d); 
}
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive:true }); }

// BANK: master + 3 sub‑clues (answer + 5 hints each). Add more entries over time.
const BANK = [
  {
    master: "APPLE",
    difficulty: "easy",
    subClues: [
      { answer: "FRUIT", hints: ["red","green","sweet","pie","orchard"] },
      { answer: "TREE",  hints: ["branch","leaf","trunk","orchard","blossom"] },
      { answer: "SEED",  hints: ["core","plant","sprout","pit","germ"] }
    ],
    funFact: "There are over 7,500 varieties of apples grown worldwide."
  },
  {
    master: "BRIDGE",
    difficulty: "normal",
    subClues: [
      { answer: "RIVER",  hints: ["water","bank","flow","cross","current"] },
      { answer: "GAP",    hints: ["space","divide","span","break","separate"] },
      { answer: "CARD",   hints: ["deck","game","trick","bid","suit"] }
    ],
    funFact: "The Golden Gate Bridge was once the longest and tallest suspension bridge."
  },
  {
    master: "LIGHT",
    difficulty: "normal",
    subClues: [
      { answer: "BULB",  hints: ["lamp","switch","socket","LED","filament"] },
      { answer: "SUN",   hints: ["day","shine","sky","bright","solar"] },
      { answer: "SPEED", hints: ["fast","c","vacuum","physics","Einstein"] }
    ],
    funFact: "Light travels at about 299,792 km per second in vacuum."
  },
  {
    master: "MOUSE",
    difficulty: "easy",
    subClues: [
      { answer: "CHEESE", hints: ["food","hole","dairy","trap","rodent"] },
      { answer: "CURSOR", hints: ["pointer","click","screen","drag","arrow"] },
      { answer: "TAIL",   hints: ["long","animal","end","behind","appendage"] }
    ],
    funFact: "Computer mice were first popularized by Xerox PARC and Apple."
  },
  {
    master: "SPRING",
    difficulty: "normal",
    subClues: [
      { answer: "SEASON", hints: ["flowers","rain","bloom","March","April"] },
      { answer: "COIL",   hints: ["metal","compress","bounce","spiral","tension"] },
      { answer: "WATER",  hints: ["fresh","source","hot","natural","well"] }
    ],
    funFact: "In many regions, spring is associated with new growth and festivals."
  }
];

function entryFor(dateStr){
  const idx = Math.abs([...dateStr].reduce((a,c)=>a + c.charCodeAt(0),0)) % BANK.length;
  const base = BANK[idx];
  // build rich schema with 3 sub‑clues A/B/C
  const subClues = base.subClues.map((sc, i) => ({
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

function writePuzzle(date){
  const file = path.join(OUT_DIR, `${date}.json`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(entryFor(date), null, 2));
    console.log('Wrote', file);
  } else {
    console.log('Exists', file);
  }
}

function main(){
  ensureDir(OUT_DIR);
  const now = new Date();
  const today = ymd(now);
  const tomorrow = ymd(new Date(now.getTime() + 24*60*60*1000));
  writePuzzle(today);
  writePuzzle(tomorrow);
}
main();
