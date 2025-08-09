#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const TZ = 'Europe/Zagreb';
const EPOCH = "2025-08-01";
const outDir = path.resolve(process.cwd(), "puzzles");

// Curated bank; expand as we go
const BANK = [
  {
    master: { answer: "Pyramids of Giza",
      funFact: "The Great Pyramid was the tallest human-made structure for ~3,800 years.",
      learnMoreUrl: "https://en.wikipedia.org/wiki/Giza_pyramid_complex",
      aliases: ["Great Pyramid","Giza Pyramids"]
    },
    subs: [
      { answer:"Egypt",      hints:["africa","desert","nile","pharaoh","sphinx"] },
      { answer:"Limestone",  hints:["rock","blocks","quarry","calcium","sedimentary"] },
      { answer:"Pharaoh",    hints:["ruler","tomb","dynasty","sarcophagus","hieroglyphs"] }
    ]
  },
  {
    master: { answer: "Mount Everest",
      funFact: "Its summit sits on the Nepal–China border; it grows a few mm yearly.",
      learnMoreUrl: "https://en.wikipedia.org/wiki/Mount_Everest",
      aliases: ["Sagarmatha","Chomolungma"]
    },
    subs: [
      { answer:"Himalayas", hints:["range","asia","peaks","nepal","tibet"] },
      { answer:"Sherpa",    hints:["guide","nepal","altitude","expedition","porter"] },
      { answer:"Oxygen",    hints:["bottles","thin air","mask","altitude","breathing"] }
    ]
  },
  {
    master: { answer:"The Colosseum",
      funFact:"Completed in AD 80; could hold tens of thousands for spectacles.",
      learnMoreUrl:"https://en.wikipedia.org/wiki/Colosseum",
      aliases:["Flavian Amphitheatre","Coliseum"]
    },
    subs: [
      { answer:"Rome",       hints:["italy","ancient","empire","seven hills","capital"] },
      { answer:"Gladiator",  hints:["arena","combat","sword","spectacle","crowd"] },
      { answer:"Amphitheatre",hints:["oval","seating","stone","arches","arena"] }
    ]
  }
];

function ymdInTZ(date = new Date()){
  return new Intl.DateTimeFormat('en-CA',{ timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
}
function daysBetween(a,b){
  const [ay,am,ad] = a.split('-').map(Number), [by,bm,bd] = b.split('-').map(Number);
  const A = Date.UTC(ay,am-1,ad), B = Date.UTC(by,bm-1,bd);
  return Math.floor((B-A)/86400000);
}
function pickPack(ymd){
  const idx = daysBetween(EPOCH, ymd) % BANK.length;
  return BANK[(idx + BANK.length) % BANK.length];
}
function validate(p){
  const bad = [];
  const banned = /fuck|shit|bitch|cunt|nazi|hitler/i;
  if (banned.test(JSON.stringify(p))) bad.push("Profanity detected");
  p.subClues.forEach(sc=>{
    if (sc.hints.length !== 5) bad.push(`Sub ${sc.id} must have exactly 5 hints`);
  });
  if (bad.length) throw new Error(bad.join("\n"));
}
function buildPuzzle(ymd){
  const pack = pickPack(ymd);
  const puzzle = {
    id: ymd,
    master: {
      answer: pack.master.answer,
      aliases: pack.master.aliases || [],
      funFact: pack.master.funFact,
      learnMoreUrl: pack.master.learnMoreUrl
    },
    subClues: pack.subs.map((s,i)=>({
      id: String.fromCharCode(65 + i),
      answer: s.answer,
      aliases: s.aliases || [],
      hints: s.hints.slice(0,5)
    }))
  };
  validate(puzzle);
  return puzzle;
}
function writePuzzle(ymd){
  const pz = buildPuzzle(ymd);
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${ymd}.json`);
  fs.writeFileSync(file, JSON.stringify(pz, null, 2));
  console.log("Wrote", file);
}

// Generate for today and tomorrow (DST-proof, outage-proof)
const today = ymdInTZ();
const tomorrow = ymdInTZ(new Date(Date.now() + 86400000));
writePuzzle(today);
writePuzzle(tomorrow);
