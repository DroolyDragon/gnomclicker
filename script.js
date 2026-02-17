/* MENU + CUTSCENE + GAME LOGIC */

let count = 0;
const counterEl = document.getElementById('counter');
const bombBtn = document.getElementById('bombBtn');
const bombImg = document.getElementById('bombImg');
const clickSound = document.getElementById('clickSound');
const introOverlay = document.getElementById('introOverlay');
const introBomb = document.getElementById('introBomb');
const introBombFriend = document.getElementById('introBombFriend');
const skipBtn = document.getElementById('skipBtn');
const van = document.querySelector('.van');
const net = document.querySelector('.net');
const jailCover = document.querySelector('.jailCover');
const scream = document.getElementById('scream');

/* QoL: multiplier and high score */
let lastClickTime = 0;
let multiplier = 1;
let highScore = Number(localStorage.getItem('gnom_high') || 0);

/* simple particle pool for bursts */
const particlePool = [];
const stage = document.getElementById('stage');
for (let i=0;i<12;i++){
  const p = document.createElement('span');
  p.style.position='absolute'; p.style.pointerEvents='none';
  p.style.width='8px'; p.style.height='8px'; p.style.borderRadius='50%';
  p.style.opacity='0'; p.style.transform='translate(-50%,-50%) scale(0.6)';
  particlePool.push(p); stage.appendChild(p);
}

const menu = document.getElementById('menu');
const playBtn = document.getElementById('playBtn');
const creditsBtn = document.getElementById('creditsBtn');
const creditsModal = document.getElementById('credits');
const closeCredits = document.getElementById('closeCredits');
const gnomUpload = document.getElementById('gnomUpload');
const difficultySelect = document.getElementById('difficulty');

let unlocked = false;
let captionInterval = null;
let narrationStep = 0;
let gameTimer = null;
let goal = Infinity;
let timeLimit = Infinity;
let gameEndTimeout = null;

// shorter lore lines for faster cutscene
const loreLines = [
  "Two gnoms danced in the sun, the best of friends.",
  "They spun and laughed, sharing dreams.",
  "A pink friend twirled and the world felt light.",
  "But shadows crept — an ice-cream van rolled near.",
  "A net fell, cruel and fast, tearing one away.",
  "The sky swallowed her friend whole."
];

function showCredits() {
  creditsModal.classList.remove('hiddenIntro');
  creditsModal.setAttribute('aria-hidden', 'false');
}
function hideCredits() {
  creditsModal.classList.add('hiddenIntro');
  creditsModal.setAttribute('aria-hidden', 'true');
}

// enable main game after cutscene
function endIntro() {
  if (!introOverlay) return;
  introOverlay.classList.add('hiddenIntro');
  introOverlay.setAttribute('aria-hidden', 'true');
  bombBtn.disabled = false;
  unlocked = true;
  // clear narration
  if (captionInterval) { clearInterval(captionInterval); captionInterval = null; }
  if (van) van.classList.remove('van-enter', 'van-kidnap');
  if (net) net.classList.remove('net-drop');
  if (jailCover) jailCover.classList.remove('captured');
}

// orchestrate shorter intro and trigger scream on kidnap
function startNarration() {
  const caption = document.querySelector('.caption');
  if (!caption) return;
  caption.textContent = loreLines[0];
  narrationStep = 0;

  // run faster: advance every ~2s to keep cutscene short (~12s)
  captionInterval = setInterval(() => {
    narrationStep++;
    if (narrationStep < loreLines.length) caption.textContent = loreLines[narrationStep];

    // van arrival earlier
    if (narrationStep === 2 && van) van.classList.add('van-enter');

    // kidnapping step
    if (narrationStep === 4) {
      if (net) net.classList.add('net-drop');
      if (van) van.classList.add('van-kidnap');
      if (jailCover) jailCover.classList.add('captured');
      // kidnap animation
      introBomb.style.animation = 'kidnapFly 1.0s ease-in forwards';
      // play scream immediately
      if (scream) { scream.currentTime = 0; scream.play().catch(()=>{}); }
    }

    // finish shortly after final line
    if (narrationStep >= loreLines.length) {
      clearInterval(captionInterval);
      captionInterval = null;
      setTimeout(() => endIntro(), 900); // quick cut to gameplay
    }
  }, 2000);
}

// start cutscene (called after menu Play)
function startCutsceneAndThenGame() {
  // show intro overlay
  introOverlay.classList.remove('hiddenIntro');
  introOverlay.setAttribute('aria-hidden', 'false');
  // reset visuals
  if (introBomb) { introBomb.style.animation = ''; introBomb.style.opacity = ''; }
  if (van) van.classList.remove('van-enter','van-kidnap');
  if (net) net.classList.remove('net-drop');
  if (jailCover) jailCover.classList.remove('captured');
  // start narration quicker
  startNarration();
  // safety end in 14s max
  setTimeout(() => endIntro(), 14000);
}

// GAME MODE setup
function setupMode() {
  const mode = difficultySelect.value;
  count = 0;
  multiplier = 1;
  lastClickTime = 0;
  clearTimeout(gameEndTimeout);
  // show counter with high score
  counterEl.textContent = `Clicks: ${count} • x${multiplier} • HS:${highScore}`;
  if (mode === 'speed') {
    goal = Infinity;
    timeLimit = Infinity;
  } else if (mode === 'hard') {
    goal = 100;
    timeLimit = 50 * 1000;
  } else if (mode === 'imp') {
    goal = 500;
    timeLimit = 5 * 1000;
  }
}

// menu wiring
/* Play now opens a modes panel; mode selection starts the game */
const modesPanel = document.getElementById('modesPanel');
const modeSpeed = document.getElementById('modeSpeed');
const modeHard = document.getElementById('modeHard');
const modeImp = document.getElementById('modeImp');
const modesBack = document.getElementById('modesBack');

playBtn.addEventListener('click', () => {
  // show modes in-place
  modesPanel.classList.remove('hiddenIntro');
  document.getElementById('menuActions').classList.add('hiddenIntro');
});

/* apply upload helper used before starting game */
function applyUploadIfAny() {
  if (gnomUpload.files && gnomUpload.files[0]) {
    const file = gnomUpload.files[0];
    const url = URL.createObjectURL(file);
    bombImg.src = url;
    introBomb.src = url;
    introBombFriend.src = url;
  }
}

/* mode button handlers */
function startWithMode(modeValue) {
  // set hidden difficulty for legacy code
  const diff = document.getElementById('difficulty');
  diff.value = modeValue;
  // apply upload, setup, hide menu and start
  applyUploadIfAny();
  setupMode();
  menu.classList.add('hiddenIntro');
  menu.setAttribute('aria-hidden','true');
  startCutsceneAndThenGame();
}

modeSpeed.addEventListener('click', () => startWithMode('speed'));
modeHard.addEventListener('click', () => startWithMode('hard'));
modeImp.addEventListener('click', () => startWithMode('imp'));
modesBack.addEventListener('click', () => {
  modesPanel.classList.add('hiddenIntro');
  document.getElementById('menuActions').classList.remove('hiddenIntro');
});

creditsBtn.addEventListener('click', () => showCredits());
if (closeCredits) closeCredits.addEventListener('click', () => hideCredits());

// skip intro wiring
if (skipBtn) {
  skipBtn.addEventListener('click', (e) => { e.preventDefault(); endIntro(); });
  skipBtn.addEventListener('keyup', (e) => { if (e.code === 'Enter' || e.code === 'Space') endIntro(); });
}

// click handling with tiny bounce and counter pop, allow rapid clicks
function spawnBurst(x,y) {
  for (let i=0;i<6;i++){
    const p = particlePool[(Math.random()*particlePool.length)|0];
    p.style.left = x + (Math.random()*36-18) + 'px';
    p.style.top = y + (Math.random()*36-18) + 'px';
    p.style.background = ['#fff','#ffd','#ffb','#fff8a'][i%4];
    p.style.opacity = '1';
    p.style.transition = 'transform 600ms cubic-bezier(.2,.9,.2,.9), opacity 600ms';
    p.style.transform = `translate(-50%,-50%) translate(${(Math.random()*160-80)}px,${(Math.random()*160-80)}px) scale(${0.6+Math.random()*0.8})`;
    setTimeout(()=>{ p.style.opacity='0'; }, 520);
  }
}

function handleClick() {
  if (!unlocked) return;
  const now = performance.now();

  // combo multiplier: clicking quickly increases multiplier
  if (now - lastClickTime < 420) {
    multiplier = Math.min(8, multiplier + 0.25);
  } else {
    multiplier = Math.max(1, multiplier * 0.85);
  }
  lastClickTime = now;

  // if a timed mode, start timer on first click
  if (count === 0 && isFinite(timeLimit)) {
    gameEndTimeout = setTimeout(() => {
      unlocked = false;
      bombBtn.disabled = true;
      counterEl.textContent = `Final: ${count}`;
      // persist highscore
      if (count > highScore) {
        highScore = count;
        localStorage.setItem('gnom_high', highScore);
      }
    }, timeLimit);
  }

  // increment by multiplier (round down to keep integers)
  const delta = Math.max(1, Math.floor(multiplier));
  count += delta;
  // update high score live for speed mode
  if (count > highScore) {
    highScore = count;
    localStorage.setItem('gnom_high', highScore);
  }

  counterEl.textContent = `Clicks: ${count} • x${multiplier.toFixed(2)} • HS:${highScore}`;

  // counter pop
  counterEl.classList.add('pop');
  clearTimeout(counterEl._popTimeout);
  counterEl._popTimeout = setTimeout(()=> counterEl.classList.remove('pop'), 160);

  // bomb tiny bounce + small idle wobble reset
  bombBtn.classList.remove('bounce');
  void bombBtn.offsetWidth;
  bombBtn.classList.add('bounce');
  clearTimeout(bombBtn._bounceTimeout);
  bombBtn._bounceTimeout = setTimeout(()=> bombBtn.classList.remove('bounce'), 180);

  // playful quick scale on bomb image
  bombImg.style.transition = 'transform 220ms cubic-bezier(.2,.9,.3,1)';
  bombImg.style.transform = 'scale(1.12)';
  setTimeout(()=> bombImg.style.transform = '', 220);

  // spawn small burst at pointer center
  const rect = bombBtn.getBoundingClientRect();
  spawnBurst(rect.left + rect.width/2, rect.top + rect.height/2);

  // play click sound overlapping with tiny pitch variance
  const soundClone = clickSound.cloneNode(true);
  try { soundClone.playbackRate = 0.9 + Math.random()*0.3; } catch(e){}
  soundClone.volume = 0.95;
  soundClone.play().catch(()=>{});

  // check win condition if applicable
  if (isFinite(goal) && count >= goal) {
    clearTimeout(gameEndTimeout);
    unlocked = false;
    bombBtn.disabled = true;
    counterEl.textContent = `Victory! ${count}`;
    if (count > highScore) {
      highScore = count; localStorage.setItem('gnom_high', highScore);
    }
  }
}

/* pointer and keyboard wiring with responsive touch-friendly size already present */
bombBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); handleClick(); });
bombBtn.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') handleClick(); });

/* slight idle wobble to invite clicks */
setInterval(()=> {
  if (!bombBtn.classList.contains('bounce') && unlocked) {
    bombBtn.style.transition = 'transform 900ms cubic-bezier(.2,.9,.3,1)';
    bombBtn.style.transform = `translateY(${Math.sin(Date.now()/800)*3}px)`;
    setTimeout(()=> bombBtn.style.transform = '', 900);
  }
}, 2500);

// expose a way to open menu again via double-click on counter (convenience)
counterEl.addEventListener('dblclick', () => {
  menu.classList.remove('hiddenIntro');
  menu.setAttribute('aria-hidden','false');
  // reset game state
  unlocked = false;
  bombBtn.disabled = true;
  clearTimeout(gameEndTimeout);
});