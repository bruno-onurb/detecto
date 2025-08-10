// Dual-schema validator for puzzles/
// Accepts EITHER the old "simple" format:
//   { date, master: "WORD", clues: [ ...4 strings... ], difficulty, version }
// OR the rich format:
//   { date, master:{answer,...}, subClues:[ {id,answer,hints[]}, ...3 items... ], difficulty, version }

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUZZLES_DIR = path.join(ROOT, 'puzzles');

function ensure(cond, msg, errors) { if (!cond) errors.push(msg); }
const isStr = v => typeof v === 'string';
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

function validateSimple(obj, errors) {
  // simple: master is string, clues is array of 4 strings (2-20 chars)
  ensure(isStr(obj.master), 'simple: master must be string', errors);
  if (isStr(obj.master)) {
    ensure(obj.master.length >= 3 && obj.master.length <= 12, 'master must be 3-12 chars', errors);
  }
  ensure(Array.isArray(obj.clues), 'Missing: clues', errors);
  if (Array.isArray(obj.clues)) {
    ensure(obj.clues.length === 4, 'clues must have exactly 4 items', errors);
    obj.clues.forEach((c, i) => {
      ensure(isStr(c), `clues[${i}] must be string`, errors);
      if (isStr(c)) ensure(c.length >= 2 && c.length <= 20, `clues[${i}] length 2-20`, errors);
    });
  }
}

function validateRich(obj, errors) {
  // rich: master is object with answer string, subClues is array of >=3 with answer string and hints >=1
  ensure(isObj(obj.master), 'rich: master must be object', errors);
  if (isObj(obj.master)) {
    ensure(isStr(obj.master.answer), 'master.answer must be string', errors);
    if (isStr(obj.master.answer)) {
      ensure(obj.master.answer.length >= 3 && obj.master.answer.length <= 12, 'master.answer must be 3-12 chars', errors);
    }
    if (obj.master.aliases !== undefined) {
      ensure(Array.isArray(obj.master.aliases), 'master.aliases must be array if present', errors);
    }
  }
  ensure(Array.isArray(obj.subClues), 'Missing: subClues', errors);
  if (Array.isArray(obj.subClues)) {
    ensure(obj.subClues.length >= 3, 'subClues must have at least 3 items', errors);
    obj.subClues.forEach((sc, i) => {
      ensure(isObj(sc), `subClues[${i}] must be object`, errors);
      if (isObj(sc)) {
        ensure(isStr(sc.answer), `subClues[${i}].answer must be string`, errors);
        if (isStr(sc.answer)) ensure(sc.answer.length >= 2 && sc.answer.length <= 20, `subClues[${i}].answer length 2-20`, errors);
        ensure(Array.isArray(sc.hints), `subClues[${i}].hints must be array`, errors);
        if (Array.isArray(sc.hints)) {
          ensure(sc.hints.length >= 1, `subClues[${i}].hints must have >=1 item`, errors);
          sc.hints.forEach((h, j) => ensure(isStr(h), `subClues[${i}].hints[${j}] must be string`, errors));
        }
      }
    });
  }
}

function validateOne(obj) {
  const errors = [];

  ensure(isObj(obj), 'Not an object', errors);
  ensure(isStr(obj.date) && /^\d{4}-\d{2}-\d{2}$/.test(obj.date), 'Bad or missing date (YYYY-MM-DD)', errors);
  ensure(isStr(obj.difficulty) && ['easy','normal','hard'].includes(obj.difficulty), 'difficulty must be easy|normal|hard', errors);
  ensure(Number.isInteger(obj.version) && obj.version >= 1, 'version must be integer >=1', errors);

  // accept either schema
  const looksSimple = isStr(obj.master) || obj.clues !== undefined;
  const looksRich = isObj(obj.master) || obj.subClues !== undefined;

  if (looksRich) {
    validateRich(obj, errors);
  } else if (looksSimple) {
    validateSimple(obj, errors);
  } else {
    errors.push('Schema not recognized: need either simple (master string + clues[4]) or rich (master object + subClues[>=3]).');
  }

  return errors;
}

function main() {
  if (!fs.existsSync(PUZZLES_DIR)) {
    console.error('No puzzles/ directory found.');
    process.exit(1);
  }
  const files = fs.readdirSync(PUZZLES_DIR).filter(f => f.endsWith('.json')).sort();
  let failed = 0;
  for (const f of files) {
    const p = path.join(PUZZLES_DIR, f);
    try {
      const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
      const errs = validateOne(obj);
      if (errs.length) {
        failed++;
        console.error(`❌ ${f}:`);
        errs.forEach(e => console.error('  -', e));
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
