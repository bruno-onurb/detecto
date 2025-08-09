// Simple daily puzzle generator (no API). Writes today's and tomorrow's files.
const fs = require('fs');
const path = require('path');

const TZ = 'Europe/Zagreb';
const OUT_DIR = path.join(process.cwd(), 'puzzles');

function ymd(d){ return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(d); }
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive:true }); }

const BANK = [
  { master: "BRIDGE", clues: ["RIVER","GAP","CARD","CONNECT"], difficulty:"normal" },
  { master: "LIGHT",  clues: ["BULB","WEIGHT","SUN","SPEED"],  difficulty:"normal" },
  { master: "APPLE",  clues: ["FRUIT","TREE","MAC","SEED"],    difficulty:"easy"   },
  { master: "TRACK",  clues: ["RACE","TRACE","RAIL","FOLLOW"], difficulty:"normal" },
  { master: "RING",   clues: ["PHONE", "CIRCLE", "BELL", "JEWEL"], difficulty: "easy" },
  { master: "PLANT",  clues: ["LEAF", "FACTORY", "STEM", "GROW"], difficulty: "normal" },
  { master: "TABLE",  clues: ["DINING", "CHART", "ROW", "FURNITURE"], difficulty: "easy" },
  { master: "CLOUD",  clues: ["RAIN", "SERVER", "SKY", "PUFF"], difficulty: "normal" },
  { master: "POINT",  clues: ["DOT", "ARGUE", "SCORE", "TIP"], difficulty: "normal" },
  { master: "SCALE",  clues: ["WEIGH", "LIZARD", "LEVEL", "MUSIC"], difficulty: "hard" },
  { master: "CHARGE", clues: ["BATTERY", "ACCUSE", "PRICE", "RUN"], difficulty: "normal" },
  { master: "BARK",   clues: ["DOG", "TREE", "SHOUT", "SKIN"], difficulty: "normal" },
  { master: "BANK",   clues: ["MONEY", "RIVER", "SLOPE", "TRUST"], difficulty: "normal" },
  { master: "KEY",    clues: ["LOCK", "PIANO", "ISLAND", "IMPORTANT"], difficulty: "easy" },
  { master: "MARCH",  clues: ["MONTH", "WALK", "PARADE", "ARMY"], difficulty: "easy" },
  { master: "CAP",    clues: ["HAT", "LIMIT", "BOTTLE", "CAPITAL"], difficulty: "easy" },
  { master: "PRESS",  clues: ["NEWS", "PUSH", "IRON", "MEDIA"], difficulty: "normal" },
  { master: "DRILL",  clues: ["TOOL", "TRAIN", "HOLE", "MILITARY"], difficulty: "normal" },
  { master: "DRAFT",  clues: ["BREEZE", "SKETCH", "BEER", "SELECT"], difficulty: "hard" },
  { master: "SPRING", clues: ["SEASON", "COIL", "JUMP", "WATER"], difficulty: "normal" },
  { master: "SUIT",   clues: ["LAWSUIT", "DECK", "CLOTHES", "FIT"], difficulty: "normal" },
  { master: "PITCH",  clues: ["TAR", "THROW", "TONE", "SALES"], difficulty: "normal" },
  { master: "BLOCK",  clues: ["WOOD", "CITY", "STOP", "CHAIN"], difficulty: "normal" },
  { master: "NET",    clues: ["INTERNET", "FISH", "GOAL", "AFTER"], difficulty: "easy" },
  { master: "MOUSE",  clues: ["CHEESE","PC","CURSOR","TAIL"],  difficulty:"easy"   }
];

function puzzleFor(dateStr){
  // deterministically rotate through BANK by date
  const idx = Math.abs([...dateStr].reduce((a,c)=>a + c.charCodeAt(0),0)) % BANK.length;
  const base = BANK[idx];
  return { date: dateStr, master: base.master, clues: base.clues, difficulty: base.difficulty, version: 1 };
}

function writePuzzle(date){
  const file = path.join(OUT_DIR, `${date}.json`);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(puzzleFor(date), null, 2));
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
