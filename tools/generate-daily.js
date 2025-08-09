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
