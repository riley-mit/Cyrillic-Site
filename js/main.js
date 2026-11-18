//retrieving my data abt the words from the json
let letters = [];
let currentLetter = null;
let isUpper = false;

// Find each element once, up front
const nameEl     = document.getElementById("letter-name");
const typedEl    = document.getElementById("typed-letter");
const photosEl   = document.getElementById("photos");
const wordListEl = document.getElementById("word-list");
const playBtn    = document.getElementById("play-btn");
const skipBtn    = document.getElementById("skip-btn");
const audioEl    = new Audio();
const caseBtn = document.getElementById("case-btn");

async function loadData() {
  const response = await fetch("data/ru.json");
  if (!response.ok) {
    console.error("Couldn't load data:", response.status);
    return;
  }
  letters = await response.json();
  showRandomLetter(false);   // first card: don't try sound yet
}
loadData();

function showRandomLetter(playSound = true) {
  // pick a letter, avoiding an immediate repeat
  let next;
  do {
    next = letters[Math.floor(Math.random() * letters.length)];
  } while (next === currentLetter && letters.length > 1);
  currentLetter = next;

  clearDrawing();
  redrawGuide();

  renderLetter();
  renderPhotos();
  renderWords();

  audioEl.src = currentLetter.audio;
  if (playSound) {
    audioEl.play().catch(err => console.log("Audio blocked:", err));
  }
}

function renderLetter() {
  typedEl.textContent = isUpper ? currentLetter.upper : currentLetter.lower;
  nameEl.textContent = currentLetter.name;
}

function renderPhotos() {
  photosEl.textContent = "";                        // clear the old photos
  for (const path of currentLetter.images || []) {  // "or empty list" if none
    const img = document.createElement("img");
    img.src = path;
    img.alt = `Example for ${currentLetter.upper}`;
    photosEl.appendChild(img);
  }
}

// Renders the word lists
function renderWords() {
  wordListEl.textContent = "";
  for (const w of currentLetter.words) {
    const li = document.createElement("li");
    for (const ch of w.word) {
      if (ch.toLowerCase() === currentLetter.lower) {
        const strong = document.createElement("strong");
        strong.textContent = ch;
        li.appendChild(strong);
      } else {
        li.appendChild(document.createTextNode(ch));
      }
    }
    li.appendChild(document.createTextNode(` — ${w.meaning}`));
    wordListEl.appendChild(li);
  }
}

skipBtn.addEventListener("click", () => showRandomLetter());
playBtn.addEventListener("click", () => {
  audioEl.currentTime = 0;     // restart from the beginning
  audioEl.play();
});

caseBtn.addEventListener("click", () => {
  if (!currentLetter) return;          // data hasn't loaded yet
  isUpper = !isUpper;                  // flip between true and false
  renderLetter();                      // updates the typed letter
  clearDrawing();                      // old strokes no longer match
  redrawGuide();                       // guide switches to the new case
  caseBtn.textContent = isUpper ? "Show lowercase" : "Show uppercase";
});

//From here on out it's the drawing canvas code
// ---------- Settings you can tune ----------
const PEN_WIDTH = 12;
const PEN_COLOR = "#222";
const GUIDE_SIZE_UPPER = 260;   // font sizes in pixels for the guide letter
const GUIDE_SIZE_LOWER = 300;

// ---------- Elements ----------
const guideCanvas = document.getElementById("guide");
const guideCtx    = guideCanvas.getContext("2d");
const padCanvas   = document.getElementById("pad");
const padCtx      = padCanvas.getContext("2d");

// ---------- State ----------
let strokes = [];          // every stroke so far; each stroke is a list of {x, y} points
let currentStroke = null;  // the stroke being drawn right now (null = pen is up)

// ---------- Helpers ----------
function getCurrentChar() {
  return isUpper ? currentLetter.upper : currentLetter.lower;
}

function guideFontSize() {
  return isUpper ? GUIDE_SIZE_UPPER : GUIDE_SIZE_LOWER;
}

// ---------- The guide letter ----------
// Draws the current letter, centered. The extraWidth option will matter for scoring later.
function drawTarget(context, extraWidth = 0) {
  const ch = getCurrentChar();
  context.font = `${guideFontSize()}px "Shantell Sans", sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#000";
  context.strokeStyle = "#000";

  // measure the actual ink so we can center it exactly
  const m = context.measureText(ch);
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const x = (guideCanvas.width  - inkW) / 2 + m.actualBoundingBoxLeft;
  const y = (guideCanvas.height - inkH) / 2 + m.actualBoundingBoxAscent;

  context.fillText(ch, x, y);
  if (extraWidth > 0) {             // optional thick outline (for tolerance in scoring)
    context.lineWidth = extraWidth;
    context.lineJoin = "round";
    context.strokeText(ch, x, y);
  }
}

async function redrawGuide() {
  // wait until the font (including its Cyrillic part) is ready
  await document.fonts.load(`${guideFontSize()}px "Shantell Sans"`, getCurrentChar());
  guideCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
  drawTarget(guideCtx);
}

// ---------- The user's drawing ----------
function getPos(e) {
  const rect = padCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (padCanvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (padCanvas.height / rect.height)
  };
}

function drawStrokes(context, width) {
  context.strokeStyle = PEN_COLOR;
  context.fillStyle = PEN_COLOR;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const stroke of strokes) {
    context.beginPath();
    if (stroke.length === 1) {
      // a single tap: draw a dot (needed for the dots on ё and the mark on й)
      context.arc(stroke[0].x, stroke[0].y, width / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      stroke.forEach((p, i) => i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y));
      context.stroke();
    }
  }
}

function redrawPad() {
  padCtx.clearRect(0, 0, padCanvas.width, padCanvas.height);
  drawStrokes(padCtx, PEN_WIDTH);
}

function clearDrawing() {
  strokes = [];
  currentStroke = null;
  redrawPad();
}

function undoStroke() {
  strokes.pop();          // remove the most recent stroke
  redrawPad();
}

// ---------- Pointer events (mouse, touch, and stylus all work) ----------
padCanvas.addEventListener("pointerdown", e => {
  padCanvas.setPointerCapture(e.pointerId);   // keep tracking if the pointer leaves the box
  currentStroke = [getPos(e)];
  strokes.push(currentStroke);
  redrawPad();
});

padCanvas.addEventListener("pointermove", e => {
  if (!currentStroke) return;                 // pen is up, ignore
  currentStroke.push(getPos(e));
  redrawPad();
});

function endStroke() {
  if (!currentStroke) return;
  currentStroke = null;
  checkAnswer();
}
padCanvas.addEventListener("pointerup", endStroke);
padCanvas.addEventListener("pointercancel", endStroke);

document.getElementById("undo-btn").addEventListener("click", undoStroke);
document.getElementById("clear-btn").addEventListener("click", clearDrawing);

// ---------- Placeholder for later ----------
function checkAnswer() {
  // scoring goes here: compare the strokes against the guide letter
}