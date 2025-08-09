// scripts/generate-puzzle.mjs
import fs from "fs";
import path from "path";

// ---- 1) Date helpers (Europe/Zagreb) ----
const TZ = "Europe/Zagreb";
function ymdInTZ(tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}
const today = ymdInTZ(TZ);
const outDir = path.join(process.cwd(), "puzzles");
const outFile = path.join(outDir, `${today}.json`);

// ---- 2) Skip if today's file already exists ----
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outFile)) {
  console.log(`Puzzle already exists for ${today}, skipping.`);
  process.exit(0);
}

// ---- 3) OpenAI client (uses Structured Outputs) ----
// Docs: https://platform.openai.com/docs/guides/structured-outputs
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY.");
  process.exit(1);
}

// ---- 4) Define your puzzle schema ----
// TODO: adjust to match YOUR exact JSON keys.
// I’m using a sensible default; update names if your current JSON differs.
const puzzleSchema = {
  type: "object",
  additionalProperties: false,
  required: ["date", "masterClue", "subClues", "answers"],
  properties: {
    date: { type: "string", description: "YYYY-MM-DD date of this puzzle" },
    masterClue: { type: "string", minLength: 5, maxLength: 120 },
    subClues: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["hint", "wordLength"],
        properties: {
          hint: { type: "string", minLength: 2, maxLength: 80 },
          wordLength: { type: "integer", minimum: 3, maximum: 9 }
        }
      }
    },
    answers: {
      type: "object",
      additionalProperties: false,
      required: ["master", "subs"],
      properties: {
        master: { type: "string", minLength: 3, maxLength: 20 },
        subs: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: { type: "string", minLength: 3, maxLength: 12 }
        }
      }
    }
  }
};

// ---- 5) Prompt the model to create a logically consistent puzzle ----
const system = `
You generate daily puzzles for a Decrypto-Wordle hybrid.
Return STRICT JSON that matches the provided JSON schema. 
Constraints:
- "answers.subs" must be four distinct, common English words.
- "subClues[i].hint" is a natural-language clue that leads to answers.subs[i].
- "subClues[i].wordLength" must equal answers.subs[i].length.
- "answers.master" relates to all four sub answers in a clever, non-obscure way.
- "masterClue" should hint at that relation without giving it away.
- Difficulty: casual players. No proper nouns. No offensive content.
- The "date" must be ${today}.
`;

const user = `
Generate the puzzle for date ${today}. 
Ensure internal consistency across hints, word lengths, and answers.
Return ONLY JSON, no prose.
`;

// ---- 6) Call the API with Structured Outputs ----
// Using models that support structured outputs; see docs.
// https://platform.openai.com/docs/guides/text
// https://platform.openai.com/docs/guides/structured-outputs
const response = await client.responses.create({
  model: "gpt-4o-mini", // or another model that supports Structured Outputs
  input: [
    { role: "system", content: system },
    { role: "user", content: user }
  ],
  // New-style structured outputs
  response_format: { type: "json_schema", json_schema: { name: "Puzzle", schema: puzzleSchema, strict: true } }
});

// ---- 7) Extract JSON safely ----
const content = response.output?.[0]?.content?.[0]?.text ?? null;
if (!content) {
  console.error("No content returned from model.");
  process.exit(1);
}

let puzzle;
try {
  puzzle = JSON.parse(content);
} catch (e) {
  console.error("Model did not return valid JSON:", content);
  process.exit(1);
}

// ---- 8) Final validations ----
if (puzzle.date !== today) {
  console.error(`Puzzle date mismatch: expected ${today}, got ${puzzle.date}`);
  process.exit(1);
}
if (puzzle.subClues?.length !== 4 || puzzle.answers?.subs?.length !== 4) {
  console.error("Expected exactly 4 sub clues and 4 sub answers.");
  process.exit(1);
}
for (let i = 0; i < 4; i++) {
  if (puzzle.subClues[i].wordLength !== puzzle.answers.subs[i].length) {
    console.error(`Length mismatch at index ${i}: hint says ${puzzle.subClues[i].wordLength}, answer is ${puzzle.answers.subs[i]} (${puzzle.answers.subs[i].length}).`);
    process.exit(1);
  }
}

// ---- 9) Write file ----
fs.writeFileSync(outFile, JSON.stringify(puzzle, null, 2), "utf8");
console.log(`Wrote ${outFile}`);
