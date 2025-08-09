// Minimal validator: checks every puzzles/*.json against tools/puzzle.schema.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUZZLES_DIR = path.join(ROOT, 'puzzles');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'puzzle.schema.json'), 'utf8'));

// trivial JSON Schema-ish validator for our simple schema
function validateOne(obj) {
  const errors = [];

  function ensure(cond, msg) { if (!cond) errors.push(msg); }

  ensure(typeof obj === 'object' && obj, 'Not an object');

  // required
  for (const key of ['date', 'master', 'clues', 'difficulty', 'version']) {
    ensure(Object.prototype.hasOwnProperty.call(obj, key), `Missing: ${key}`);
  }

  if (obj.date) ensure(/^\d{4}-\d{2}-\d{2}$/.test(obj.date), 'Bad date format');
  if (obj.master) ensure(typeof obj.master === 'string' && obj.master.length >= 3 && obj.master.length <= 12, 'master must be 3-12 chars');
  if (obj.clues) {
    ensure(Array.isArray(obj.clues), 'clues must be array');
    ensure(obj.clues.length === 4, 'clues must have exactly 4 items');
    if (Array.isArray(obj.clues)) {
      obj.clues.forEach((c, i) => {
        ensure(typeof c === 'string', `clues[${i}] must be string`);
        if (typeof c === 'string') ensure(c.length >= 2 && c.length <= 12, `clues[${i}] length 2-12`);
      });
    }
  }
  if (obj.difficulty) ensure(['easy','normal','hard'].includes(obj.difficulty), 'difficulty must be easy|normal|hard');
  if (obj.version) ensure(Number.isInteger(obj.version) && obj.version >= 1, 'version must be integer >=1');

  return errors;
}

function main() {
  if (!fs.existsSync(PUZZLES_DIR)) {
    console.error('No puzzles/ directory found.');
    process.exit(1);
  }
  const files = fs.readdirSync(PUZZLES_DIR).filter(f => f.endsWith('.json'));
  let failed = 0;
  for (const f of files) {
    const p = path.join(PUZZLES_DIR, f);
    try {
      const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
      const errs = validateOne(obj);
      if (errs.length) {
        failed++;
        console.error(`❌ ${f}:`);
        errs.forEach(e => console.error('   -', e));
      } else {
        console.log(`✅ ${f}`);
      }
    } catch (e) {
      failed++;
      console.error(`❌ ${f}: invalid JSON (${e.message})`);
    }
  }
  if (failed) {
    console.error(`Validation failed for ${failed} file(s).`);
    process.exit(1);
  }
  console.log('All puzzle files look good.');
}
main();
