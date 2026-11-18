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

