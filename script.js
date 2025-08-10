// --- Daily Puzzle Loader + State Guard (paste at very top) ---
const DAILY_TZ = 'Europe/Zagreb';
const STORAGE_KEY = 'detecto-game-state-v3'; // saved state key (keep stable)

// Format a date in the target timezone as YYYY-MM-DD
function ymdInTZ(date, tz = DAILY_TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

// Fetch JSON with a nice error if missing
async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Try today; if not found, walk backwards up to 14 days and take first hit
async function loadPuzzleWithFallback(maxLookbackDays = 14) {
  const now = new Date();
  for (let back = 0; back <= maxLookbackDays; back++) {
    const d = new Date(now);
    d.setDate(now.getDate() - back);
    const ymd = ymdInTZ(d);
    const url = `puzzles/${ymd}.json`;
    try {
      const data = await fetchJson(url);
      console.log('Loaded puzzle:', url);
      return data; // { date, master, clues, ... }
    } catch (e) {
      // keep trying
    }
  }
  throw new Error('No puzzle files found in the last 14 days.');
}

// Basic state helpers
function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
  catch { return null; }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/*
 * Game logic for the Decrypto‑Wordle Hybrid.
 * This file handles loading/saving state, rendering UI elements
 * and processing guesses for both the master clue and sub‑clues.
 */

// Sample puzzle data. In a production scenario this could be loaded
// from a server or rotated daily. For now it's static for simplicity.
// --- Daily Puzzle Loader ---
let PUZZLE_DATA = null; // will be set before init()
const STORAGE_KEY = 'detecto-game-state-v3'; // keep as-is in your file

function ymdInTZ(tz){
  const fmt = new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'});
  return fmt.format(new Date());
}

async function loadTodaysPuzzle(){
  const today = ymdInTZ(DAILY_TZ);
  const url = `puzzles/${today}.json`; // RELATIVE path (works on GitHub Pages)
  try{
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const day = await res.json();
    // Normalize to match old code expectations
    PUZZLE_DATA = {
      id: day.id || today,
      master: day.master,
      subClues: day.subClues.map(sc => ({ ...sc, revealedCount: 1, solved: false }))
    };
  }catch(err){
    console.error('Missing puzzle for today, falling back to a safe default.', err);
    PUZZLE_DATA = {
      id: "fallback-" + today,
      master: {
        answer: "David",
        aliases: ["Michelangelo's David", "Statue of David"],
        funFact: "Carved from a single block of marble between 1501–1504, Michelangelo’s David stands 17 feet tall in Florence and is a Renaissance icon.",
        learnMoreUrl: "https://en.wikipedia.org/wiki/David_(Michelangelo)"
      },
      subClues: [
        { id:"A", answer:"Marble", aliases:["Carrara marble"], hints:["stone","white","carve","statue","material"], revealedCount:1, solved:false },
        { id:"B", answer:"Florence", aliases:["Firenze"], hints:["italy","renaissance","duomo","uffizi","tuscany"], revealedCount:1, solved:false },
        { id:"C", answer:"Michelangelo", aliases:["Buonarroti"], hints:["artist","sculptor","painter","sistine","renowned"], revealedCount:1, solved:false }
      ]
    };
  }
}

// Replace the old DOMContentLoaded with this:
document.addEventListener('DOMContentLoaded', async () => {
  await loadTodaysPuzzle();
  init();               // your existing init() uses PUZZLE_DATA
  startMidnightWatcher();
});

function startMidnightWatcher(){
  let current = ymdInTZ(DAILY_TZ);
  setInterval(async () => {
    const now = ymdInTZ(DAILY_TZ);
    if (now !== current){
      current = now;
      localStorage.removeItem(STORAGE_KEY);
      await loadTodaysPuzzle();
      prevLivesCount = null; // keep your existing var
      loadGame();            // reuse your existing function
      render();
      const toast = document.getElementById('help-toast');
      if (toast){
        toast.querySelector('strong').textContent = 'New Puzzle';
        toast.querySelector('p').textContent = 'A fresh daily puzzle is ready.';
        toast.classList.remove('hidden');
        setTimeout(()=>toast.classList.add('hidden'), 6000);
      }
    }
  }, 30000);
}

// Icon SVG definitions for UI elements
const ICONS = {
  magnify: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 6L9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  lightbulb: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 18h6M9 14a6 6 0 1 1 6 0v2H9v-2Z"/><path d="M10 22h4"/></svg>'
};

// Maximum lives for the game
const MAX_LIVES = 10;

// Track previous lives for flash animation on life decrement
let prevLivesCount = null;

/**
 * Refocus an input element after a guess. Ensures the caret is placed at
 * the end of the current value so the user can immediately type another
 * guess. Uses a timeout to ensure caret placement after re-render.
 * @param {HTMLInputElement|null} elem
 */
function refocus(elem) {
  if (!elem) return;
  // Save current value to restore caret position
  const val = elem.value;
  elem.focus();
  // Some browsers need a delay to place the caret correctly after DOM updates
  setTimeout(() => {
    try {
      elem.selectionStart = elem.selectionEnd = val.length;
    } catch (_) {
      // Ignore if setting selection fails (e.g., unsupported element)
    }
  }, 0);
}

// Handler reference for closing modal on Escape key; set dynamically in showEndModal
let modalEscHandler = null;

// Key used to track whether the onboarding has been seen in localStorage
const ONBOARDING_KEY = 'detecto_onboarding_seen_v1';
// Handler reference for closing onboarding on Escape key
let onboardEscHandler = null;
// --- Focus Trap Utilities ---
let _focusTrapCleanup = null;
let _lastFocusedElement = null;

function trapFocus(container){
  // Clean any previous trap before setting a new one
  releaseFocus();
  if (!container) return;

  // Remember where focus was before opening
  _lastFocusedElement = document.activeElement;

  const focusableSel =
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
    'button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const raw = container.querySelectorAll(focusableSel);
  const focusables = Array.from(raw).filter(el => el.offsetParent !== null);

  const first = focusables[0];
  const last  = focusables[focusables.length - 1];

  // Move focus inside the dialog
  if (first) first.focus();

  function onKeydown(e){
    if (e.key !== 'Tab') return;
    if (!focusables.length) { e.preventDefault(); return; }

    // Shift+Tab on first -> go to last
    if (e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
      return;
    }
    // Tab on last -> go to first
    if (!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
      return;
    }
  }

  function onFocusIn(e){
    // If focus tries to escape the container, pull it back
    if (!container.contains(e.target)) {
      e.stopPropagation();
      if (first) first.focus();
    }
  }

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('focusin', onFocusIn);

  _focusTrapCleanup = () => {
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('focusin', onFocusIn);
    _focusTrapCleanup = null;
  };
}

function releaseFocus(){
  if (_focusTrapCleanup) _focusTrapCleanup();
  if (_lastFocusedElement && typeof _lastFocusedElement.focus === 'function'){
    _lastFocusedElement.focus();
  }
  _lastFocusedElement = null;
}

/**
 * Trigger a shake animation on a feedback element and fade it out. This helper
 * removes and re-adds the 'shake' class to restart the animation, then
 * automatically hides the element by fading its opacity. Visibility is
 * restored on the next render when the feedback message updates.
 *
 * @param {HTMLElement|null} feedbackElem - The feedback element to animate.
 */
function triggerFeedbackShake(feedbackElem) {
  if (!feedbackElem) return;
  // Remove the shake class to reset any ongoing animation
  feedbackElem.classList.remove('shake');
  // Force reflow to restart the animation
  void feedbackElem.offsetWidth;
  // Add the shake class to trigger the animation
  feedbackElem.classList.add('shake');
  // Fade out after 2.5 seconds and clear feedback from state so it doesn't reappear
  setTimeout(() => {
    feedbackElem.style.opacity = '0';
    // Determine which feedback to clear: master or sub‑clue
    if (feedbackElem.id === 'master-feedback') {
      gameState.masterFeedback = '';
    } else {
      // Find closest card id to identify sub‑clue
      const cardElem = feedbackElem.closest('.card');
      if (cardElem && cardElem.id && cardElem.id.startsWith('subclue-')) {
        const subId = cardElem.id.replace('subclue-', '');
        const sc = gameState.puzzle.subClues.find(c => c.id === subId);
        if (sc) sc.feedback = '';
      }
    }
    // Persist the cleared state
    saveGame();
  }, 2500);
}

/**
 * Reveal all sub‑clues in the puzzle. This helper is invoked when the game is
 * over (win or lose) so that players can see all answers and hints. It sets
 * each sub‑clue's revealedCount to the maximum number of hints, ensures the
 * title displays the answer by setting forceRevealTitle, clears any feedback,
 * and resets the justRevealed flag. The master clue answer will be shown via
 * render() when gameOver is true.
 */
function revealAllClues() {
  gameState.puzzle.subClues.forEach(sc => {
    sc.revealedCount = sc.hints.length;
    // Mark this clue to force its title to show the answer even if unsolved
    sc.forceRevealTitle = true;
    // Clear feedback to avoid noise when the game is over
    sc.feedback = '';
    // Reset animation flag
    sc.justRevealed = false;
  });
}

/**
 * Announce a message for screen reader users by updating the sr-announcer
 * element. Setting textContent on an aria-live region triggers assistive
 * technologies to read the content aloud.
 * @param {string} message
 */
function announce(message) {
  const announcer = document.getElementById('sr-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
}

/**
 * Toggle the visibility of the help toast panel without blocking gameplay.
 */
function toggleHelpToast() {
  const toast = document.getElementById('help-toast');
  if (!toast) return;
  // Determine whether we are showing the toast
  const show = toast.classList.contains('hidden');
  toast.classList.toggle('hidden');
  // Automatically hide after 7 seconds if just shown
  if (show) {
    setTimeout(() => {
      // Ensure toast still exists and has not been manually hidden
      if (toast && !toast.classList.contains('hidden')) {
        toast.classList.add('hidden');
      }
    }, 7000);
  }
}

/**
 * Refocus the specified guess input element after a wrong guess. This helper
 * ensures the input regains focus on the next event loop tick, allowing
 * players to type immediately without clicking. It is used by both
 * handleSubGuess and handleMasterGuess for consistent behaviour.
 *
 * @param {string} inputId - The DOM id of the input element to focus.
 */
function refocusGuessInput(inputId) {
  setTimeout(() => {
    const el = document.getElementById(inputId);
    if (el) {
      el.focus();
    }
  }, 0);
}

/**
 * Update the lives UI in the header. Renders a series of magnifying glass
 * icons equal to MAX_LIVES and dims the icons corresponding to lost lives.
 * When a life is lost, briefly flash the newly lost icon red.
 */
function updateLivesUI() {
  const livesContainer = document.getElementById('lives-container');
  if (!livesContainer) return;
  // Clear current lives display
  livesContainer.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'life-icon';
    // Insert the magnifying glass SVG
    iconWrapper.innerHTML = ICONS.magnify;
    // Dim icons beyond current lives
    if (i >= gameState.lives) {
      iconWrapper.classList.add('dim');
    }
    livesContainer.appendChild(iconWrapper);
  }
  // Animate the icon corresponding to a life lost
  if (prevLivesCount !== null && gameState.lives < prevLivesCount) {
    const lostIndex = gameState.lives;
    const lostIcon = livesContainer.children[lostIndex];
    if (lostIcon) {
      lostIcon.classList.add('flash-red');
      // Remove the flash class after the animation completes
      setTimeout(() => {
        lostIcon.classList.remove('flash-red');
      }, 400);
    }
  }
  prevLivesCount = gameState.lives;
}

// Current game state; initialised either from saved data or fresh puzzle.
let gameState;

/**
 * Normalise a string by trimming, removing punctuation/accents and lower‑casing.
 * This helps handle user input variations so that " Michelangelo " matches "michelangelo".
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

/**
 * Load the game state from localStorage if it exists and matches the current
 * puzzle id. Otherwise initialise a new state based on PUZZLE_DATA.
 */
function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure the saved state belongs to the same puzzle id.
      if (parsed && parsed.puzzle && parsed.puzzle.id === PUZZLE_DATA.id) {
        gameState = parsed;
        // Ensure the new gameOver flag exists on older saved states
        if (typeof gameState.gameOver !== 'boolean') {
          gameState.gameOver = false;
        }
        // Ensure each sub‑clue has wrongGuesses array for backward compatibility
        gameState.puzzle.subClues.forEach(sc => {
          if (!Array.isArray(sc.wrongGuesses)) {
            sc.wrongGuesses = [];
          }
        });
        // Sanity check: ensure types are as expected
        return;
      }
    } catch (e) {
      console.warn('Failed to parse saved game state:', e);
    }
  }
  // Otherwise set up a fresh game state.
  gameState = {
    puzzle: JSON.parse(JSON.stringify(PUZZLE_DATA)),
    lives: 10,
    masterSolved: false,
    guesses: [],
    // Hold the last feedback message for the master clue so it persists across re-renders
    masterFeedback: '',
    // Game over flag indicates board should be fully revealed and inputs disabled
    gameOver: false
  };
  // Initialise sub‑clue feedback holders and animation flags.
  gameState.puzzle.subClues.forEach(sc => {
    sc.feedback = '';
    sc.justRevealed = false;
    // Initialise wrong guesses list for each sub‑clue
    sc.wrongGuesses = [];
  });
}

/**
 * Persist the current game state to localStorage. This should be called
 * after any state mutation to allow resuming on refresh.
 */
function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

/**
 * Compute the final score based on remaining lives and bonuses.
 * @returns {{score: number, breakdown: string[]}}
 */
function computeScore() {
  let score = Math.max(gameState.lives, 0) * 10;
  const breakdown = [`Base score: ${Math.max(gameState.lives, 0)} lives × 10 = ${Math.max(gameState.lives, 0) * 10}`];
  // Sub‑clue bonus: +10 for each sub‑clue solved using ≤3 hints.
  // The number of hints used equals 1 plus the number of wrong guesses for that sub‑clue prior to the correct one.
  gameState.puzzle.subClues.forEach(sc => {
    if (sc.solved) {
      // Count wrong guesses before the first correct guess for this sub‑clue
      const guessesForSub = gameState.guesses.filter(g => g.target === 'SUB' && g.subId === sc.id);
      let wrongCount = 0;
      for (const g of guessesForSub) {
        if (g.correct) {
          break;
        }
        wrongCount++;
      }
      const used = 1 + wrongCount; // initial hint plus wrong attempts
      if (used <= 3) {
        score += 10;
        breakdown.push(`Bonus: Sub‑clue ${sc.id} solved with ${used} hints → +10`);
      }
    }
  });
  // Master bonus: +20 if solved before all sub‑clues solved
  const unsolvedSubs = gameState.puzzle.subClues.some(sc => !sc.solved);
  if (gameState.masterSolved && unsolvedSubs) {
    score += 20;
    breakdown.push('Bonus: Master solved before all sub‑clues → +20');
  }
  return { score, breakdown };
}

/**
 * Render the UI according to the current game state. This includes
 * updating the lives counter, rendering sub‑clue cards and their hints,
 * and handling solved states.
 */
function render() {
  // Update lives icons in header
  updateLivesUI();

  // Disable or enable master input/button depending on game state. When the
  // game is over or the master is solved, inputs must be disabled.
  const masterInput = document.getElementById('master-input');
  const masterBtn = document.getElementById('master-guess-btn');
  if (masterInput && masterBtn) {
    const disable = gameState.masterSolved || gameState.lives <= 0 || gameState.gameOver;
    masterInput.disabled = disable;
    masterBtn.disabled = disable;
  }

  // Update master heading: show answer once solved or when game is over
  const masterTitle = document.querySelector('#master-clue h2');
  if (masterTitle) {
    masterTitle.textContent = (gameState.masterSolved || gameState.gameOver)
      ? gameState.puzzle.master.answer
      : 'Master Clue';
  }

  // Update master feedback message
  const masterFeedbackElem = document.getElementById('master-feedback');
  if (masterFeedbackElem) {
    if (gameState.masterFeedback) {
      const isCorrect = gameState.masterFeedback.toLowerCase().startsWith('correct');
      // Always include 'feedback' class for styling and animation control
      masterFeedbackElem.className = 'feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
      const icon = isCorrect ? ICONS.check : ICONS.x;
      masterFeedbackElem.innerHTML = `${icon} <span>${gameState.masterFeedback}</span>`;
    } else {
      masterFeedbackElem.className = 'feedback';
      masterFeedbackElem.innerHTML = '';
    }
  }

  // Render sub‑clue cards
  const subContainer = document.getElementById('sub-clues');
  if (subContainer) {
    subContainer.innerHTML = '';
    gameState.puzzle.subClues.forEach(sc => {
      const card = document.createElement('article');
      card.classList.add('card');
      card.classList.add('sub');
      // Assign an id to the sub‑clue card for feedback targeting (e.g., subclue-A)
      card.id = `subclue-${sc.id}`;
      // Title row with solved badge
      const topRow = document.createElement('div');
      topRow.className = 'row';
      topRow.style.justifyContent = 'space-between';
      const title = document.createElement('h3');
      // If solved, show the answer instead of "Clue X"
      const answerTitle = (sc.solved || gameState.gameOver || sc.forceRevealTitle)
        ? sc.answer
        : `Clue ${sc.id}`;
      title.textContent = answerTitle;
      topRow.appendChild(title);
      if (sc.solved) {
        const badge = document.createElement('span');
        badge.className = 'badge-solved';
        badge.innerHTML = `${ICONS.check}<span>Solved</span>`;
        topRow.appendChild(badge);
      }
      card.appendChild(topRow);
      // Hints chips
      const hintsWrap = document.createElement('div');
      hintsWrap.className = 'hints';
      for (let i = 0; i < sc.revealedCount; i++) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = sc.hints[i];
        // Add reveal animation to the newest hint if flagged
        if (i === sc.revealedCount - 1 && sc.justRevealed) {
          chip.classList.add('chip-reveal');
          // Reset the flag so it only animates once
          sc.justRevealed = false;
        }
        hintsWrap.appendChild(chip);
      }
      card.appendChild(hintsWrap);
      // Input row if unsolved and game active (not gameOver)
      if (!gameState.gameOver && !sc.solved && !gameState.masterSolved && gameState.lives > 0) {
        const inputRow = document.createElement('div');
        inputRow.className = 'row';
        const input = document.createElement('input');
        input.className = 'input';
        input.type = 'text';
        input.placeholder = 'Guess sub‑clue';
        input.id = `input-${sc.id}`;
        // Accessibility: aria-label describing the input
        input.setAttribute('aria-label', `Enter your guess for clue ${sc.id}`);
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.textContent = 'Guess';
        button.id = `btn-${sc.id}`;
        // Accessibility: aria-label describing the action
        button.setAttribute('aria-label', `Guess clue ${sc.id}`);
        button.addEventListener('click', () => handleSubGuess(sc.id));
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleSubGuess(sc.id);
          }
        });
        inputRow.appendChild(input);
        inputRow.appendChild(button);
        card.appendChild(inputRow);
      }
      // Feedback message
      if (sc.feedback) {
        const feedbackDiv = document.createElement('div');
        const isCorrect = sc.feedback.toLowerCase().startsWith('correct');
        // Always include 'feedback' class for styling and animation control
        feedbackDiv.className = 'feedback ' + (isCorrect ? 'feedback-correct' : 'feedback-wrong');
        const icon = isCorrect ? ICONS.check : ICONS.x;
        feedbackDiv.innerHTML = `${icon} <span>${sc.feedback}</span>`;
        card.appendChild(feedbackDiv);
      }

      // List wrong guesses under this sub‑clue, if any
      if (sc.wrongGuesses && sc.wrongGuesses.length > 0) {
        const wrongGuessesDiv = document.createElement('div');
        wrongGuessesDiv.className = 'wrong-guesses';
        sc.wrongGuesses.forEach(g => {
          const chip = document.createElement('span');
          chip.className = 'wrong-guess-chip';
          chip.textContent = g;
          wrongGuessesDiv.appendChild(chip);
        });
        card.appendChild(wrongGuessesDiv);
      }
      subContainer.appendChild(card);
    });
  }
}

/**
 * Handle guess for a sub‑clue. Evaluate against answer and aliases and
 * update state accordingly. Also manage hint reveal and lives.
 * @param {string} subId
 */
function handleSubGuess(subId) {
  const sc = gameState.puzzle.subClues.find(c => c.id === subId);
  if (!sc || sc.solved || gameState.lives <= 0) return;
  const inputElem = document.getElementById(`input-${subId}`);
  const rawGuess = inputElem ? inputElem.value : '';
  const guess = rawGuess.trim();
  // Prevent empty submissions by shaking the input
  if (!guess) {
    if (inputElem) {
      inputElem.classList.add('shake');
      setTimeout(() => inputElem.classList.remove('shake'), 400);
    }
    return;
  }
  const normGuess = normalize(guess);
  let correct = false;
  // Evaluate against answer and aliases
  if (normalize(sc.answer) === normGuess) {
    correct = true;
  } else if (sc.aliases) {
    for (const alias of sc.aliases) {
      if (normalize(alias) === normGuess) {
        correct = true;
        break;
      }
    }
  }
  // Log this guess
  gameState.guesses.push({
    target: 'SUB',
    subId,
    guess,
    correct,
    livesLeft: correct ? gameState.lives : gameState.lives - 1
  });
  if (correct) {
    sc.solved = true;
    // Record how many hints were used for scoring
    sc.hintsUsed = sc.revealedCount;
    sc.revealedCount = sc.hints.length;
    sc.feedback = 'Correct. All hints revealed.';
    // Clear new hint flag when solved
    sc.justRevealed = false;
  } else {
    // Wrong guess: cost a life unless this clue will be auto‑solved right now
    let increased = false;
    if (sc.revealedCount < sc.hints.length) {
      sc.revealedCount++;
      increased = true;
    }

    // If we just reached the maximum number of hints, auto‑solve and stop further guesses
    if (sc.revealedCount >= sc.hints.length) {
      // Deduct a life once for the wrong guess that triggered the final reveal
      gameState.lives--;
      sc.solved = true;                  // lock this sub‑clue
      sc.hintsUsed = sc.hints.length;    // counts as max (no bonus)
      sc.feedback = `All hints revealed — answer: ${sc.answer}`;
      sc.justRevealed = increased;       // play the chip-in animation on the last hint
    } else {
      // Normal wrong guess: deduct a life and show the new hint
      gameState.lives--;
      const newHint = sc.hints[sc.revealedCount - 1];
      sc.feedback = newHint ? `Nope. New hint: ${newHint}` : 'Nope.';
      sc.justRevealed = increased;
    }
    // Record this wrong guess if not already stored (case-insensitive)
    if (!correct) {
      // Store original guess, but avoid duplicates based on case-insensitive match
      if (!sc.wrongGuesses.some(g => g.toLowerCase() === guess.toLowerCase())) {
        sc.wrongGuesses.push(guess);
      }
    }
  }
  // Clear the input after guessing
  if (inputElem) {
    inputElem.value = '';
  }
  saveGame();
  updateLivesUI();
  render();
  // Determine if this was a wrong guess
  const wasWrong = !correct;
  // If wrong, trigger shake/fade on this sub-clue's feedback message
  if (wasWrong) {
    const feedbackElem = document.querySelector(`#subclue-${subId} .feedback`);
    triggerFeedbackShake(feedbackElem);
  }
  // After re-rendering, refocus the input for this sub-clue if still unsolved
  if (!sc.solved && gameState.lives > 0 && !gameState.gameOver) {
    refocusGuessInput(`input-${subId}`);
  }
  // Announce feedback for assistive technologies
  announce(sc.feedback);
  if (gameState.lives <= 0) {
    showEndModal(false);
  }
}

/**
 * Handle guess for the master clue. Deduct a life if wrong and end the game
 * on correct answer or if lives drop to zero.
 */
function handleMasterGuess() {
  if (gameState.masterSolved || gameState.lives <= 0) return;
  const inputElem = document.getElementById('master-input');
  const rawGuess = inputElem ? inputElem.value : '';
  const guess = rawGuess.trim();
  // Prevent empty submissions by shaking the input
  if (!guess) {
    if (inputElem) {
      inputElem.classList.add('shake');
      setTimeout(() => inputElem.classList.remove('shake'), 400);
    }
    return;
  }
  const normGuess = normalize(guess);
  let correct = false;
  // Evaluate master answer and aliases
  if (normalize(gameState.puzzle.master.answer) === normGuess) {
    correct = true;
  } else if (gameState.puzzle.master.aliases) {
    for (const alias of gameState.puzzle.master.aliases) {
      if (normalize(alias) === normGuess) {
        correct = true;
        break;
      }
    }
  }
  // Log this master guess
  gameState.guesses.push({
    target: 'MASTER',
    guess,
    correct,
    livesLeft: correct ? gameState.lives : gameState.lives - 1
  });
  if (correct) {
    gameState.masterSolved = true;
    gameState.masterFeedback = 'Correct!';
  } else {
    gameState.lives--;
    gameState.masterFeedback = 'Nope.';
  }
  // Clear the master input after guessing
  if (inputElem) {
    inputElem.value = '';
  }
  saveGame();
  updateLivesUI();
  render();
  // Determine if this was a wrong guess
  const wasWrong = !correct;
  // If wrong, trigger shake/fade on the master feedback message
  if (wasWrong) {
    const feedbackElem = document.querySelector('#master-clue .feedback');
    triggerFeedbackShake(feedbackElem);
  }
  // Announce the master feedback for screen readers
  announce(gameState.masterFeedback);
  // If still active, keep focus in the master input for fast subsequent guesses
  if (!gameState.masterSolved && gameState.lives > 0 && !gameState.gameOver) {
    refocusGuessInput('master-input');
  }
  if (correct) {
    showEndModal(true);
  } else if (gameState.lives <= 0) {
    showEndModal(false);
  }
}

/**
 * Show the end modal with win/lose message, score, fun fact and link.
 * @param {boolean} won
 */
function showEndModal(won) {
  const overlay = document.getElementById('modal-overlay');
  const titleElem = document.getElementById('modal-title');
  const messageElem = document.getElementById('modal-message');
  const scoreBreakdown = document.getElementById('score-breakdown');
  const playAgainBtn = document.getElementById('modal-play-again');
  const shareBtn = document.getElementById('modal-share');
  const learnMoreBtn = document.getElementById('modal-learn-more');

  // Mark the game as over and reveal all remaining clues. This ensures the
  // underlying board is fully revealed when the modal appears. Persist state
  // so a refresh retains the reveal.
  gameState.gameOver = true;
  revealAllClues();
  saveGame();
  // Refresh the background UI under the modal
  render();

  // Calculate how many guesses it took to solve the master when winning
  let masterGuesses = 0;
  if (won) {
    const masterLogs = gameState.guesses.filter(g => g.target === 'MASTER');
    for (let i = 0; i < masterLogs.length; i++) {
      masterGuesses = i + 1;
      if (masterLogs[i].correct) break;
    }
  }

  // Set modal title
  titleElem.textContent = won ? 'CASE CLOSED' : 'GAME OVER';
  // Reset content containers
  messageElem.innerHTML = '';
  scoreBreakdown.innerHTML = '';
  // Subtitle text
  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.textContent = won ? `You solved the Master in ${masterGuesses} guess${masterGuesses !== 1 ? 'es' : ''}.` : 'You ran out of lives.';
  messageElem.appendChild(subtitle);
  // Fun fact block
  const factBlock = document.createElement('div');
  factBlock.className = 'fact';
  factBlock.innerHTML = `${ICONS.lightbulb}<div><strong>Fun Fact</strong><br>${gameState.puzzle.master.funFact}</div>`;
  messageElem.appendChild(factBlock);
  // Show answers if lost
  if (!won) {
    const answersDiv = document.createElement('div');
    answersDiv.className = 'answer-list';
    let html = `<p>Master — <strong>${gameState.puzzle.master.answer}</strong></p>`;
    gameState.puzzle.subClues.forEach(sc => {
      html += `<p>Clue ${sc.id} — ${sc.answer}</p>`;
    });
    answersDiv.innerHTML = html;
    messageElem.appendChild(answersDiv);
  }
  // Score breakdown for win
  if (won) {
    const { score, breakdown } = computeScore();
    const scoreHeader = document.createElement('p');
    scoreHeader.innerHTML = `<strong>Your score: ${score}</strong>`;
    scoreBreakdown.appendChild(scoreHeader);
    const list = document.createElement('ul');
    breakdown.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
    scoreBreakdown.appendChild(list);
  }
  // Display the modal
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden','false');
const dialog = document.getElementById('modal');
if (dialog) trapFocus(dialog);
  // Attach modal close behaviors
  // Close on backdrop click (only when clicking directly on the overlay)
  overlay.onclick = (e) => { if (e.target === overlay) hideModal(); };
  // Close on Escape key
  modalEscHandler = (e) => { if (e.key === 'Escape') hideModal(); };
  document.addEventListener('keydown', modalEscHandler);
  // Close button inside modal
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.onclick = hideModal;

  // Apply red pulse effect on lose
  if (!won) {
    titleElem.classList.add('pulse-red');
    setTimeout(() => {
      titleElem.classList.remove('pulse-red');
    }, 600);
  }
  // Play again resets the game
  playAgainBtn.onclick = () => {
    // First hide the modal via helper (removes listeners and overlay)
    hideModal();
    // Reset game state
    localStorage.removeItem(STORAGE_KEY);
    loadGame();
    // Ensure gameOver is reset and any forced titles are cleared
    gameState.gameOver = false;
    gameState.puzzle.subClues.forEach(sc => {
      if (sc.forceRevealTitle !== undefined) delete sc.forceRevealTitle;
    });
    saveGame();
    prevLivesCount = null;
    updateLivesUI();
    render();
    // Hide the help toast on reset
    const toast = document.getElementById('help-toast');
    if (toast) toast.classList.add('hidden');
  };
  // Share result: copy a summary to clipboard or show alert
  shareBtn.onclick = () => {
    let text;
    if (won) {
      const livesLeft = Math.max(gameState.lives, 0);
      text = `I cracked today’s Detecto and learned about ${gameState.puzzle.master.answer}! Lives left: ${livesLeft}.`;
    } else {
      text = `I tried today’s Detecto but ran out of lives. The master answer was ${gameState.puzzle.master.answer}.`;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Result copied to clipboard!');
      }, () => {
        alert(text);
      });
    } else {
      alert(text);
    }
  };

  // Configure Learn More button if a URL is provided
  if (learnMoreBtn) {
    const url = gameState.puzzle.master.learnMoreUrl;
    if (url) {
      learnMoreBtn.classList.remove('hidden');
      learnMoreBtn.setAttribute('aria-label', `Learn more about ${gameState.puzzle.master.answer}`);
      learnMoreBtn.onclick = () => {
        window.open(url, '_blank');
      };
    } else {
      learnMoreBtn.classList.add('hidden');
    }
  }
}

/**
 * Hide the modal overlay and remove event listeners for closing.
 */
function hideModal(){
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden','true');
releaseFocus();
  // Remove backdrop click handler
  overlay.onclick = null;
  // Remove Escape key listener if previously attached
  if (modalEscHandler){
    document.removeEventListener('keydown', modalEscHandler);
    modalEscHandler = null;
  }
}

/**
 * Show the onboarding overlay to first-time visitors. This modal explains
 * how to play the game. It can be closed via X button, "Let’s play"
 * button, clicking the backdrop, or pressing Escape. Once dismissed,
 * the user's decision is persisted in localStorage so that the overlay
 * does not show again.
 */
function showOnboarding(){
  const ov = document.getElementById('onboard-overlay');
  if (!ov) return;
  ov.classList.remove('hidden');
  ov.setAttribute('aria-hidden','false');
  const dialog = ov.querySelector('.modal');
  if (dialog) trapFocus(dialog);
  // Backdrop click: only hide when clicking directly on overlay
  ov.onclick = (e) => { if (e.target === ov) hideOnboarding(); };
  // Esc key: attach keydown listener to close
  onboardEscHandler = (e) => { if (e.key === 'Escape') hideOnboarding(); };
  document.addEventListener('keydown', onboardEscHandler);
  // Buttons: close and got-it
  const btnClose = document.getElementById('onboard-close');
  const btnGotIt = document.getElementById('onboard-gotit');
  if (btnClose) btnClose.onclick = hideOnboarding;
  if (btnGotIt) btnGotIt.onclick = hideOnboarding;
}

/**
 * Hide the onboarding overlay and persist that the user has seen it.
 * Removes backdrop click and Escape key listeners to avoid leaks.
 */
function hideOnboarding(){
  const ov = document.getElementById('onboard-overlay');
  if (!ov) return;
  ov.classList.add('hidden');
  ov.setAttribute('aria-hidden','true');
  releaseFocus();
  // Remove backdrop click handler
  ov.onclick = null;
  // Remove Escape key listener
  if (onboardEscHandler){
    document.removeEventListener('keydown', onboardEscHandler);
    onboardEscHandler = null;
  }
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch(e) {
    // ignore errors (e.g., storage disabled)
  }
}

/**
 * Initialise event listeners and render the initial state.
 */
function init() {
  loadGame();
  render();

  // Show onboarding only for first-time visitors. Do not show if a finished
  // game state is persisted (gameOver, master solved, or no lives left).
  try {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    const gameFinished = gameState && (gameState.gameOver || gameState.masterSolved || gameState.lives <= 0);
    if (!seen && !gameFinished) {
      showOnboarding();
    }
  } catch(e) {
    // If localStorage is unavailable, fail silently
  }
  // Master guess button
  const masterBtn = document.getElementById('master-guess-btn');
  masterBtn.addEventListener('click', handleMasterGuess);
  // Allow pressing Enter to guess master when input focused
  const masterInput = document.getElementById('master-input');
  masterInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleMasterGuess();
    }
  });
  // Help button toggles the non-blocking help toast
  const helpBtn = document.getElementById('help-button');
  helpBtn.addEventListener('click', toggleHelpToast);

  // Ensure modal overlay is hidden on initial load
  const overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }

  // Attach modal action handlers in case modal is already visible from a previous session
  const playAgainBtn = document.getElementById('modal-play-again');
  const shareBtn = document.getElementById('modal-share');
  const learnMoreBtn = document.getElementById('modal-learn-more');
  if (playAgainBtn) {
    playAgainBtn.onclick = () => {
      // Use hideModal to remove overlay and listeners
      hideModal();
      localStorage.removeItem(STORAGE_KEY);
      loadGame();
      // Reset gameOver and remove forced reveal flags
      gameState.gameOver = false;
      gameState.puzzle.subClues.forEach(sc => {
        if (sc.forceRevealTitle !== undefined) delete sc.forceRevealTitle;
      });
      saveGame();
      prevLivesCount = null;
      updateLivesUI();
      render();
      // Hide help toast when resetting
      const toast = document.getElementById('help-toast');
      if (toast) toast.classList.add('hidden');
    };
  }
  if (shareBtn) {
    shareBtn.onclick = () => {
      const won = gameState.masterSolved;
      let text;
      if (won) {
        const livesLeft = Math.max(gameState.lives, 0);
        text = `I cracked today’s Detecto and learned about ${gameState.puzzle.master.answer}! Lives left: ${livesLeft}.`;
      } else {
        text = `I tried today’s Detecto but ran out of lives. The master answer was ${gameState.puzzle.master.answer}.`;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          alert('Result copied to clipboard!');
        }, () => {
          alert(text);
        });
      } else {
        alert(text);
      }
    };
  }
  // Learn more button event (will be configured in showEndModal but initialise to no-op)
  if (learnMoreBtn) {
    learnMoreBtn.onclick = () => {};
  }
}
// --- Game Bootstrap (paste near bottom) ---
async function bootstrap() {
  try {
    const puzzle = await loadPuzzleWithFallback(14);
    // --- Game Bootstrap (ensure this is already in your file)
async function bootstrap() {
  try {
    const puzzle = await loadPuzzleWithFallback(14);

    // Show which puzzle actually loaded
    const badge = document.getElementById('puzzle-status');
    if (badge) badge.textContent = `Puzzle date: ${puzzle.date}`;

    // Reset saved progress if date changed
    const state = loadState();
    if (!state || state.date !== puzzle.date) {
      saveState({ date: puzzle.date, guesses: [], solved: false });
    }

    // TODO: call your actual init with `puzzle`
    // initGame(puzzle);

  } catch (err) {
    console.error(err);
    const badge = document.getElementById('puzzle-status');
    if (badge) badge.textContent = 'No puzzles available';
    alert('Sorry, no puzzles available right now.');
  }
}
window.addEventListener('DOMContentLoaded', bootstrap);


    // Reset saved progress if the stored date is different from the loaded puzzle
    const state = loadState();
    if (!state || state.date !== puzzle.date) {
      saveState({ date: puzzle.date, guesses: [], solved: false });
    }

    // TODO: call your existing init/start functions here,
    // and pass `puzzle` if your code expects it.
    // Example:
    // initGame(puzzle);

  } catch (err) {
    console.error(err);
    alert('Sorry, no puzzles available right now.');
  }
}
window.addEventListener('DOMContentLoaded', bootstrap);
