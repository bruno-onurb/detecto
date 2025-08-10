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
    master: "APPLE", difficulty: "easy", funFact: "There are over 7,500 cultivated apple varieties worldwide.",
    subs: [
      { answer: "FRUIT", hints: ["red","green","sweet","orchard","pie"] },
      { answer: "TREE",  hints: ["branch","leaf","trunk","orchard","blossom"] },
      { answer: "SEED",  hints: ["core","plant","sprout","pit","germ"] }
    ]
  },
  {
    master: "BRIDGE", difficulty: "normal", funFact: "The Golden Gate Bridge opened in 1937 after four years of construction.",
    subs: [
      { answer: "RIVER",  hints: ["water","bank","flow","cross","current"] },
      { answer: "GAP",    hints: ["space","divide","span","break","separate"] },
      { answer: "CARD",   hints: ["deck","game","trick","bid","suit"] }
    ]
  },
  {
    master: "LIGHT", difficulty: "normal", funFact: "Light in vacuum travels at ~299,792 km/s.",
    subs: [
      { answer: "BULB",  hints: ["lamp","switch","socket","LED","filament"] },
      { answer: "SUN",   hints: ["day","shine","sky","bright","solar"] },
      { answer: "SPEED", hints: ["fast","c","vacuum","physics","einstein"] }
    ]
  },
  {
    master: "MOUSE", difficulty: "easy", funFact: "The first computer mouse prototype was made of wood in 1964.",
    subs: [
      { answer: "CHEESE", hints: ["food","hole","dairy","trap","rodent"] },
      { answer: "CURSOR", hints: ["pointer","click","screen","drag","arrow"] },
      { answer: "TAIL",   hints: ["long","animal","end","behind","appendage"] }
    ]
  },
  {
    master: "SPRING", difficulty: "normal", funFact: "In many climates, spring marks the start of the growing season.",
    subs: [
      { answer: "SEASON", hints: ["flowers","rain","bloom","march","april"] },
      { answer: "COIL",   hints: ["metal","compress","bounce","spiral","tension"] },
      { answer: "WATER",  hints: ["fresh","source","hot","natural","well"] }
    ]
  },
  {
    master: "PIANO", difficulty: "normal", funFact: "A modern piano typically has 88 keys.",
    subs: [
      { answer: "KEYS",   hints: ["black","white","ivory","press","notes"] },
      { answer: "PEDAL",  hints: ["sustain","soft","foot","floor","damper"] },
      { answer: "GRAND",  hints: ["lid","concert","large","strings","soundboard"] }
    ]
  },
  {
    master: "LASER", difficulty: "normal", funFact: "LASER stands for Light Amplification by Stimulated Emission of Radiation.",
    subs: [
      { answer: "BEAM",   hints: ["narrow","pointer","coherent","light","line"] },
      { answer: "OPTICS", hints: ["lens","mirror","focus","prism","glass"] },
      { answer: "SCANNER",hints: ["barcode","sweep","read","grocery","line"] }
    ]
  },
  {
    master: "COFFEE", difficulty: "easy", funFact: "Espresso doesn’t mean a bean; it’s a method of brewing under pressure.",
    subs: [
      { answer: "BEAN",   hints: ["roast","arabica","robusta","grind","seed"] },
      { answer: "ESPRESSO", hints: ["shot","crema","barista","portafilter","steam"] },
      { answer: "MUG",    hints: ["cup","handle","ceramic","hot","drink"] }
    ]
  },
  {
    master: "VOLCANO", difficulty: "normal", funFact: "Mauna Loa in Hawaii is one of Earth’s largest active volcanoes.",
    subs: [
      { answer: "LAVA",   hints: ["magma","molten","flow","basalt","hot"] },
      { answer: "ASH",    hints: ["fine","eruption","gray","plume","tephra"] },
      { answer: "CRATER", hints: ["summit","bowl","rim","vent","caldera"] }
    ]
  },
  {
    master: "AMAZON", difficulty: "normal", funFact: "The Amazon River discharges more water than the next seven largest rivers combined.",
    subs: [
      { answer: "RAINFOREST", hints: ["tropical","biodiversity","canopy","monkeys","jaguar"] },
      { answer: "RIVER",      hints: ["long","discharge","basin","tributary","delta"] },
      { answer: "PRIME",      hints: ["shipping","subscription","video","member","fast"] }
    ]
  },
  {
    master: "PYTHON", difficulty: "normal", funFact: "Python is named after Monty Python, not the snake.",
    subs: [
      { answer: "SNAKE",  hints: ["coil","reptile","constrictor","fang","shed"] },
      { answer: "LANGUAGE", hints: ["script","indent","package","pip","interpreter"] },
      { answer: "PANDAS", hints: ["dataframe","csv","series","analysis","library"] }
    ]
  },
  {
    master: "TOKYO", difficulty: "normal", funFact: "Tokyo is the world’s most populous metropolitan area.",
    subs: [
      { answer: "SHIBUYA", hints: ["crossing","scramble","district","neon","fashion"] },
      { answer: "SUSHI",   hints: ["rice","fish","roll","nori","wasabi"] },
      { answer: "SKYTREE", hints: ["tower","broadcast","tall","view","Sumida"] }
    ]
  },
  {
    master: "JAZZ", difficulty: "normal", funFact: "Jazz originated in New Orleans in the late 19th and early 20th centuries.",
    subs: [
      { answer: "IMPROV", hints: ["solo","riff","spontaneous","jam","chorus"] },
      { answer: "SWING",  hints: ["rhythm","big band","dance","groove","beat"] },
      { answer: "SAX",    hints: ["reed","alto","tenor","brass","coltrane"] }
    ]
  },
  {
    master: "CHOCOLATE", difficulty: "easy", funFact: "Cacao beans were once used as currency by the Maya and Aztecs.",
    subs: [
      { answer: "COCOA",  hints: ["bean","powder","hot","bitter","butter"] },
      { answer: "TRUFFLE",hints: ["ganache","ball","candy","rich","dessert"] },
      { answer: "BAR",    hints: ["wrapper","sweet","milk","dark","square"] }
    ]
  },
  {
    master: "CAMERA", difficulty: "normal", funFact: "The word camera comes from ‘camera obscura’—a darkened room.",
    subs: [
      { answer: "LENS",   hints: ["glass","aperture","focus","prime","zoom"] },
      { answer: "SENSOR", hints: ["pixels","CMOS","ISO","noise","dynamic"] },
      { answer: "SHUTTER",hints: ["exposure","speed","click","curtain","blur"] }
    ]
  },
  {
    master: "ORBIT", difficulty: "normal", funFact: "Satellites in low Earth orbit circle the planet roughly every 90 minutes.",
    subs: [
      { answer: "ELLIPSE", hints: ["oval","Kepler","focus","periapsis","apoapsis"] },
      { answer: "GRAVITY", hints: ["pull","mass","Newton","field","accelerate"] },
      { answer: "SATELLITE", hints: ["space","track","telecom","imaging","ground"] }
    ]
  },
  {
    master: "DESERT", difficulty: "normal", funFact: "Antarctica is technically the largest desert on Earth.",
    subs: [
      { answer: "SAND",   hints: ["dune","grain","beige","wind","quartz"] },
      { answer: "OASIS",  hints: ["water","palm","green","refuge","spring"] },
      { answer: "ARID",   hints: ["dry","rain","scarce","climate","barren"] }
    ]
  },
  {
    master: "COMET", difficulty: "normal", funFact: "Comets are icy bodies that develop tails when near the Sun.",
    subs: [
      { answer: "TAIL",   hints: ["dust","ion","solar","stream","behind"] },
      { answer: "HALLEY", hints: ["periodic","famous","76 years","astronomy","seen"] },
      { answer: "NUCLEUS",hints: ["ice","rock","dirty","core","kilometers"] }
    ]
  },
  {
    master: "ROBOT", difficulty: "normal", funFact: "The word ‘robot’ comes from the Czech ‘robota’ meaning forced labor.",
    subs: [
      { answer: "AUTOMATE", hints: ["machine","task","repeat","process","factory"] },
      { answer: "SENSOR",   hints: ["detect","vision","touch","input","signal"] },
      { answer: "SERVO",    hints: ["motor","actuator","angle","control","torque"] }
    ]
  },
  {
    master: "BICYCLE", difficulty: "easy", funFact: "A typical cyclist converts about 90% of energy at the pedals into motion.",
    subs: [
      { answer: "PEDAL",  hints: ["crank","clip","foot","spin","cadence"] },
      { answer: "GEAR",   hints: ["chain","sprocket","shift","ratio","derailleur"] },
      { answer: "SPOKE",  hints: ["wheel","tension","rim","hub","lace"] }
    ]
  },
  {
    master: "CASTLE", difficulty: "normal", funFact: "Many European castles began as wooden motte‑and‑bailey fortifications.",
    subs: [
      { answer: "MOAT",   hints: ["water","ditch","defense","bridge","draw"] },
      { answer: "TURRET", hints: ["tower","corner","battlement","round","stone"] },
      { answer: "KEEP",   hints: ["central","stronghold","inner","donjon","last"] }
    ]
  },
  {
    master: "DIAMOND", difficulty: "normal", funFact: "Diamonds are carbon arranged in a tetrahedral lattice.",
    subs: [
      { answer: "CARAT",  hints: ["weight","gem","metric","value","unit"] },
      { answer: "CUT",    hints: ["brilliant","facet","sparkle","round","princess"] },
      { answer: "HARD",   hints: ["Mohs","scratch","ten","durable","abrasive"] }
    ]
  },
  {
    master: "ISLAND", difficulty: "normal", funFact: "Greenland is the world’s largest island that is not a continent.",
    subs: [
      { answer: "ATOLL",  hints: ["ring","reef","lagoon","coral","tropical"] },
      { answer: "FERRY",  hints: ["boat","cross","passenger","harbor","route"] },
      { answer: "SHORE",  hints: ["coast","beach","wave","sand","line"] }
    ]
  },
  {
    master: "HONEY", difficulty: "easy", funFact: "Honey never spoils; edible samples were found in ancient Egyptian tombs.",
    subs: [
      { answer: "BEE",    hints: ["hive","queen","worker","buzz","nectar"] },
      { answer: "COMB",   hints: ["wax","hexagon","cell","frame","honey"] },
      { answer: "DRIZZLE",hints: ["pour","sweet","toast","tea","syrup"] }
    ]
  },
  {
    master: "LIBRARY", difficulty: "easy", funFact: "The Library of Congress is the largest library in the world by collection size.",
    subs: [
      { answer: "SHELF",  hints: ["books","stack","row","wood","store"] },
      { answer: "CARD",   hints: ["catalog","index","file","drawer","old"] },
      { answer: "QUIET",  hints: ["silence","sign","study","hush","rules"] }
    ]
  },
  {
    master: "PHOENIX", difficulty: "normal", funFact: "In mythology, the phoenix cyclically regenerates by rising from its ashes.",
    subs: [
      { answer: "ASHES",  hints: ["burn","gray","remains","fire","rise"] },
      { answer: "BIRD",   hints: ["wings","myth","feathers","flight","symbol"] },
      { answer: "REBIRTH",hints: ["renewal","cycle","again","return","new"] }
    ]
  },
  {
    master: "VIKING", difficulty: "normal", funFact: "Vikings were traders and explorers as well as raiders.",
    subs: [
      { answer: "LONGSHIP", hints: ["oars","sea","dragon","prow","sail"] },
      { answer: "NORSE",    hints: ["scandinavia","saga","myth","odin","thor"] },
      { answer: "RUNE",     hints: ["alphabet","carve","stone","futhark","inscribe"] }
    ]
  },
  {
    master: "TUNNEL", difficulty: "normal", funFact: "The Channel Tunnel links the UK and France beneath the English Channel.",
    subs: [
      { answer: "BORING", hints: ["machine","TBM","cutter","shield","dig"] },
      { answer: "SUBWAY", hints: ["metro","train","underground","station","line"] },
      { answer: "PORTAL", hints: ["entrance","mouth","arch","gate","opening"] }
    ]
  },
  {
    master: "MIRROR", difficulty: "normal", funFact: "Modern mirrors are made by depositing a thin layer of aluminum on glass.",
    subs: [
      { answer: "REFLECT", hints: ["image","bounce","light","surface","see"] },
      { answer: "SILVER",  hints: ["metal","backing","shine","foil","coat"] },
      { answer: "GLASS",   hints: ["pane","sheet","transparent","fragile","window"] }
    ]
  },
  {
    master: "CLOUD", difficulty: "easy", funFact: "Cirrus clouds are thin and wispy, found high in the atmosphere.",
    subs: [
      { answer: "CIRRUS", hints: ["wispy","high","ice","thin","feather"] },
      { answer: "SERVER", hints: ["compute","storage","aws","azure","remote"] },
      { answer: "STORM",  hints: ["thunder","dark","rain","front","lightning"] }
    ]
  },
  {
    master: "GARDEN", difficulty: "easy", funFact: "Community gardens can improve urban biodiversity and food access.",
    subs: [
      { answer: "SOIL",   hints: ["dirt","fertile","loam","compost","bed"] },
      { answer: "SEED",   hints: ["plant","sow","packet","sprout","germinate"] },
      { answer: "WEED",   hints: ["pull","unwanted","grow","remove","invasive"] }
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
    for (let offset = 0; offset <= 34; offset++) {
      const d = new Date(now.getTime() + offset*24*60*60*1000);
      const dateStr = ymd(d);
      write(dateStr);
    }
    console.log('DONE generating 35 days of puzzles.');
    process.exit(0);
  } catch (e) {
    console.error('GENERATOR ERROR:', e.stack || e.message);
    process.exit(1);
  }
}
main();
