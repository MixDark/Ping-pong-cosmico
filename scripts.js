// ========== GESTIÓN DE ESTADOS DEL JUEGO ==========
const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover'
};

let currentState = GameState.MENU;
let gameMode = '1P';
let difficulty = 'medium';
let isMuted = false;

// ========== ELEMENTOS DOM ==========
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const player1ScoreDiv = document.getElementById('player1Score');
const player2ScoreDiv = document.getElementById('player2Score');
const player1Label = document.getElementById('player1Label');
const player2Label = document.getElementById('player2Label');
const modeBadge = document.getElementById('modeBadge');
const hint = document.getElementById('hint');
const speedIndicator = document.getElementById('speedIndicator');

const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');

const btn1Player = document.getElementById('btn1Player');
const btn2Player = document.getElementById('btn2Player');
const diffBtns = document.querySelectorAll('.diff-btn');
const recordP1 = document.getElementById('recordP1');
const recordP2 = document.getElementById('recordP2');

const winnerText = document.getElementById('winnerText');
const winnerSubtext = document.getElementById('winnerSubtext');
const finalScore = document.getElementById('finalScore');
const maxSpeedDisplay = document.getElementById('maxSpeed');
const powerupsCollectedDisplay = document.getElementById('powerupsCollected');
const btnPlayAgain = document.getElementById('btnPlayAgain');
const btnBackToMenu = document.getElementById('btnBackToMenu');

const btnFullscreen = document.getElementById('btnFullscreen');
const btnMute = document.getElementById('btnMute');
const btnChangeMusic = document.getElementById('btnChangeMusic');
const btnMenu = document.getElementById('btnMenu');

const touchControls = document.getElementById('touchControls');
const touchUpLeft = document.getElementById('touchUpLeft');
const touchDownLeft = document.getElementById('touchDownLeft');
const touchUpRight = document.getElementById('touchUpRight');
const touchDownRight = document.getElementById('touchDownRight');

// ========== VARIABLES DEL JUEGO ==========
let p1Score = 0, p2Score = 0;
let paused = false;
let defenderMode = false;
let hackerMode = false;
let maxBallSpeed = 1;
let powerupsCollected = 0;

const WINNING_SCORE = 10;
const ring = { x: 100, y: 80, width: 700, height: 440, glow: 0, glowDir: 0.02 };
const MAX_FRUITS = 40, MAX_WAVES = 40, MAX_POWERUPS = 4, MAX_INTRUDERS = 3, MAX_CLONES = 2;

// ========== CONFIGURACIÓN DE DIFICULTAD ==========
const difficultySettings = {
  easy: { aiSpeed: 2.5, aiReaction: 0.15, ballSpeedMul: 0.85, intruderFreq: 3000 },
  medium: { aiSpeed: 4, aiReaction: 0.22, ballSpeedMul: 1.0, intruderFreq: 2000 },
  hard: { aiSpeed: 5.5, aiReaction: 0.35, ballSpeedMul: 1.15, intruderFreq: 1200 },
  impossible: { aiSpeed: 7, aiReaction: 0.5, ballSpeedMul: 1.3, intruderFreq: 800 }
};

// ========== ALMACENAMIENTO LOCAL ==========
function loadRecords() {
  const p1Record = localStorage.getItem('pingpong_p1_record') || 0;
  const p2Record = localStorage.getItem('pingpong_p2_record') || 0;
  recordP1.textContent = p1Record;
  recordP2.textContent = p2Record;
  return { p1: parseInt(p1Record), p2: parseInt(p2Record) };
}

function saveRecord(player, score) {
  const key = `pingpong_p${player}_record`;
  const current = parseInt(localStorage.getItem(key) || 0);
  if (score > current) {
    localStorage.setItem(key, score);
    if (player === 1) recordP1.textContent = score;
    else recordP2.textContent = score;
  }
}

// ========== AYUDANTES DE AUDIO ==========
function tone(freq, duration = 0.25, type = 'sine', vol = 0.08) {
  if (isMuted) return;
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    const o = A.createOscillator(); const g = A.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, A.currentTime);
    o.connect(g); g.connect(A.destination); o.start();
    o.stop(A.currentTime + duration);
  } catch (e) { }
}
function playHit() { tone(520, 0.04, 'sine', 0.05); }
function playPoint() {
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    const o = A.createOscillator(), g = A.createGain();
    o.type = 'triangle'; o.frequency.value = 220; g.gain.setValueAtTime(0.12, A.currentTime);
    o.connect(g); g.connect(A.destination);
    o.frequency.linearRampToValueAtTime(340, A.currentTime + 0.36);
    o.start(); o.stop(A.currentTime + 0.36);
  } catch (e) { }
}
function playPower() { tone(760, 0.08, 'sine', 0.06); }
function playVictory() { tone(880, 0.5, 'sine', 0.1); setTimeout(() => tone(1100, 0.5, 'sine', 0.1), 200); }

// ========== MÚSICA DE FONDO RETRO ==========
let bgMusicContext = null;
let bgMusicGain = null;
let bgMusicPlaying = false;
let currentNoteIndex = 0;
let currentMelodyIndex = 0;

// Múltiples melodías retro
const retroMelodies = [
  // Melodía 1 - Original
  [
    { freq: 523.25, duration: 0.2 },  // C5
    { freq: 659.25, duration: 0.2 },  // E5
    { freq: 783.99, duration: 0.2 },  // G5
    { freq: 1046.50, duration: 0.2 }, // C6
    { freq: 783.99, duration: 0.2 },  // G5
    { freq: 659.25, duration: 0.2 },  // E5
    { freq: 587.33, duration: 0.2 },  // D5
    { freq: 523.25, duration: 0.4 },  // C5
  ],
  // Melodía 2 - Arcade
  [
    { freq: 440.00, duration: 0.15 },  // A4
    { freq: 493.88, duration: 0.15 },  // B4
    { freq: 523.25, duration: 0.15 },  // C5
    { freq: 587.33, duration: 0.15 },  // D5
    { freq: 659.25, duration: 0.15 },  // E5
    { freq: 587.33, duration: 0.15 },  // D5
    { freq: 523.25, duration: 0.15 },  // C5
    { freq: 493.88, duration: 0.3 },   // B4
  ],
  // Melodía 3 - Espacial
  [
    { freq: 329.63, duration: 0.25 },  // E4
    { freq: 392.00, duration: 0.25 },  // G4
    { freq: 493.88, duration: 0.25 },  // B4
    { freq: 659.25, duration: 0.25 },  // E5
    { freq: 493.88, duration: 0.25 },  // B4
    { freq: 392.00, duration: 0.25 },  // G4
    { freq: 329.63, duration: 0.5 },   // E4
  ],
  // Melodía 4 - Energética
  [
    { freq: 587.33, duration: 0.1 },   // D5
    { freq: 659.25, duration: 0.1 },   // E5
    { freq: 783.99, duration: 0.1 },   // G5
    { freq: 880.00, duration: 0.1 },   // A5
    { freq: 987.77, duration: 0.2 },   // B5
    { freq: 880.00, duration: 0.1 },   // A5
    { freq: 783.99, duration: 0.1 },   // G5
    { freq: 659.25, duration: 0.2 },   // E5
  ],
  // Melodía 5 - Misteriosa
  [
    { freq: 261.63, duration: 0.3 },   // C4
    { freq: 311.13, duration: 0.3 },   // D#4
    { freq: 392.00, duration: 0.3 },   // G4
    { freq: 466.16, duration: 0.3 },   // A#4
    { freq: 392.00, duration: 0.3 },   // G4
    { freq: 311.13, duration: 0.3 },   // D#4
    { freq: 261.63, duration: 0.6 },   // C4
  ]
];

function initBackgroundMusic() {
  if (isMuted || bgMusicPlaying) return;

  try {
    bgMusicContext = new (window.AudioContext || window.webkitAudioContext)();
    bgMusicGain = bgMusicContext.createGain();
    bgMusicGain.gain.value = 0.03;
    bgMusicGain.connect(bgMusicContext.destination);
    bgMusicPlaying = true;
    currentNoteIndex = 0;

    // Seleccionar melodía aleatoria al iniciar
    currentMelodyIndex = Math.floor(Math.random() * retroMelodies.length);

    playNextNote();
  } catch (e) {
    console.log('Música de fondo no soportada');
  }
}

function playNextNote() {
  if (!bgMusicPlaying || isMuted || !bgMusicContext) return;

  const currentMelody = retroMelodies[currentMelodyIndex];
  const note = currentMelody[currentNoteIndex];

  const osc = bgMusicContext.createOscillator();
  osc.type = 'square';
  osc.frequency.value = note.freq;

  const noteGain = bgMusicContext.createGain();
  noteGain.gain.setValueAtTime(0.8, bgMusicContext.currentTime);
  noteGain.gain.exponentialRampToValueAtTime(0.01, bgMusicContext.currentTime + note.duration);

  osc.connect(noteGain);
  noteGain.connect(bgMusicGain);

  osc.start(bgMusicContext.currentTime);
  osc.stop(bgMusicContext.currentTime + note.duration);

  currentNoteIndex = (currentNoteIndex + 1) % currentMelody.length;

  setTimeout(() => playNextNote(), note.duration * 1000);
}

function stopBackgroundMusic() {
  bgMusicPlaying = false;
  if (bgMusicContext) {
    try {
      bgMusicContext.close();
      bgMusicContext = null;
    } catch (e) { }
  }
}

function pauseBackgroundMusic() {
  if (bgMusicContext && bgMusicPlaying) {
    bgMusicPlaying = false;
  }
}

function resumeBackgroundMusic() {
  if (bgMusicContext && !bgMusicPlaying && !isMuted) {
    bgMusicPlaying = true;
    playNextNote();
  }
}

function changeBackgroundMusic() {
  if (!bgMusicContext) return;

  // Cambiar a la siguiente melodía
  currentMelodyIndex = (currentMelodyIndex + 1) % retroMelodies.length;
  currentNoteIndex = 0;

  // Mostrar notificación visual
  hint.textContent = `Música ${currentMelodyIndex + 1}/${retroMelodies.length}`;
  setTimeout(() => {
    hint.textContent = hackerMode ? 'Modo Supremo: Activado' : (paused ? 'PAUSADO' : 'Modo Supremo: Desactivado');
  }, 1500);
}

// ========== ENTIDADES ==========
class Paddle {
  constructor(x, y) { this.x = x; this.y = y; this.w = 12; this.h = 90; this.speed = 5; this.power = false; this.hasShield = false; this.frozen = false; this.originalH = 90; }
  draw() {
    ctx.fillStyle = this.power ? 'rgba(255,240,140,0.95)' : this.frozen ? 'rgba(100,150,255,0.7)' : 'rgba(136,209,245,0.96)';
    roundedRect(ctx, this.x, this.y, this.w, this.h, 3, true, false);
    ctx.fillStyle = 'rgba(88,200,245,0.28)';
    ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, this.h - 4);
    if (this.hasShield) {
      ctx.strokeStyle = 'rgba(180,255,240,0.16)'; ctx.lineWidth = 8;
      ctx.strokeRect(this.x - 6, this.y - 6, this.w + 12, this.h + 12);
    }
  }
  move(dir) {
    if (this.frozen) return;
    if (dir === 'up' && this.y > ring.y) this.y -= this.speed;
    if (dir === 'down' && this.y + this.h < ring.y + ring.height) this.y += this.speed;
  }
}

class Ball {
  constructor() { this.reset(); this.r = 10; this.trail = []; this.speedMul = 1; this.id = Symbol(); this.invisible = false; }
  reset() {
    this.x = canvas.width / 2; this.y = canvas.height / 2;
    const settings = difficultySettings[difficulty];
    this.dx = (Math.random() > 0.5 ? 4 : -4) * settings.ballSpeedMul;
    this.dy = (Math.random() * 3 - 1.5) * settings.ballSpeedMul;
    this.trail = []; this.speedMul = 1; this.alive = true; this.invisible = false;
  }
  draw() {
    if (this.invisible && Math.floor(Date.now() / 100) % 2 === 0) return;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 12) this.trail.shift();
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.r * (i / 12), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${(i * 28 + this.speedMul * 30) % 360}, 82%, 60%, ${i / 18})`;
      ctx.fill();
    }
    radialCircle(this.x, this.y, this.r, 'rgba(136,209,245,0.98)', 'rgba(88,200,245,0.36)');
  }
  update(p1, p2) {
    this.x += this.dx * this.speedMul;
    this.y += this.dy * this.speedMul;
    if (this.speedMul > 3.5) this.speedMul = 3.5;

    if (this.speedMul > maxBallSpeed) maxBallSpeed = this.speedMul;

    if (this.y - this.r < ring.y) { this.y = ring.y + this.r; this.dy *= -1; this.speedMul *= 1.02; createWave(this.x, this.y); }
    if (this.y + this.r > ring.y + ring.height) { this.y = ring.y + ring.height - this.r; this.dy *= -1; this.speedMul *= 1.02; createWave(this.x, this.y); }

    if (this.x - this.r < p1.x + p1.w && this.y > p1.y && this.y < p1.y + p1.h) {
      this.dx *= -1; this.dy += (Math.random() - 0.5); this.speedMul *= 1.03; playHit(); createWave(this.x, this.y);
    }
    if (this.x + this.r > p2.x && this.y > p2.y && this.y < p2.y + p2.h) {
      this.dx *= -1; this.dy += (Math.random() - 0.5); this.speedMul *= 1.03; playHit(); createWave(this.x, this.y);
    }

    if (this.x - this.r < ring.x) {
      p2Score++; updateScore(); spawnFruitExplosion(p2.x, p2.y); playPoint();
      checkWinCondition();
      this.reset();
    }
    if (this.x + this.r > ring.x + ring.width) {
      p1Score++; updateScore(); spawnFruitExplosion(p1.x, p1.y); playPoint();
      checkWinCondition();
      this.reset();
    }
  }
}

// ========== VISUALES Y AYUDANTES ==========
function radialCircle(x, y, r, fill, inner) {
  const g = ctx.createRadialGradient(x - 3, y - 3, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, inner); g.addColorStop(1, fill);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
}
function roundedRect(ctx, x, y, w, h, r, fill, stroke) {
  if (typeof r === 'undefined') r = 5;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

let fruits = [];
function spawnFruitExplosion(cx, cy) {
  const colors = ['#ff6b6b', '#ffd56b', '#6bff8a', '#ff86ff', '#6bd3ff'];
  for (let i = 0; i < 10 && fruits.length < MAX_FRUITS; i++) {
    const ang = Math.random() * Math.PI * 2; const spd = 0.8 + Math.random() * 2.2;
    fruits.push({ x: cx, y: cy, dx: Math.cos(ang) * spd, dy: Math.sin(ang) * spd, size: 2 + Math.random() * 4, color: colors[Math.floor(Math.random() * colors.length)], life: 28 + Math.floor(Math.random() * 18) });
  }
}
function drawFruits() {
  for (let i = fruits.length - 1; i >= 0; i--) {
    const f = fruits[i];
    ctx.beginPath(); ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.fill();
    f.x += f.dx; f.y += f.dy; f.life--; if (f.life <= 0) fruits.splice(i, 1);
  }
}

let waves = [];
function createWave(x, y) { if (waves.length < MAX_WAVES) waves.push({ x, y, rad: 6, life: 26 }); }
function drawWaves() {
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    ctx.beginPath(); ctx.arc(w.x, w.y, w.rad, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${(Date.now() / 10) % 360},80%,60%,${w.life / 28})`;
    ctx.lineWidth = 2 + (1 - w.life / 28) * 3; ctx.stroke();
    w.rad += 2; w.life--; if (w.life <= 0) waves.splice(i, 1);
  }
}

let stars = [];
for (let i = 0; i < 80; i++) { stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.6 + 0.4, a: Math.random() }); }
function drawStars() {
  for (const s of stars) { s.a += (Math.random() * 0.02 - 0.01); if (s.a < 0) s.a = 0; if (s.a > 1) s.a = 1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${s.a * 0.6})`; ctx.fill(); }
}

// ========== POWER-UPS ==========
let powerUps = [];
function spawnPower() {
  if (powerUps.length >= MAX_POWERUPS) return;
  const types = ['speed', 'slowIntruders', 'shield', 'enlargePaddle', 'shrinkPaddle', 'invisibleBall', 'freezeOpponent'];
  const p = {
    x: ring.x + 30 + Math.random() * (ring.width - 60), y: ring.y + 30 + Math.random() * (ring.height - 60),
    dx: (Math.random() - 0.5) * 1.6, dy: (Math.random() - 0.5) * 1.6, size: 10, type: types[Math.floor(Math.random() * types.length)], life: 480
  };
  powerUps.push(p);
}
function drawPowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    const colorMap = {
      speed: 'rgba(255,204,0,0.12)', slowIntruders: 'rgba(51,255,51,0.10)', shield: 'rgba(255,102,255,0.10)',
      enlargePaddle: 'rgba(100,200,255,0.12)', shrinkPaddle: 'rgba(255,100,100,0.12)',
      invisibleBall: 'rgba(200,200,200,0.10)', freezeOpponent: 'rgba(150,220,255,0.12)'
    };
    const fillMap = {
      speed: '#ffcc00', slowIntruders: '#33ff33', shield: '#ff66ff',
      enlargePaddle: '#64c8ff', shrinkPaddle: '#ff6464', invisibleBall: '#cccccc', freezeOpponent: '#96dcff'
    };
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size + 3, 0, Math.PI * 2); ctx.fillStyle = colorMap[p.type] || 'rgba(255,255,255,0.1)'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = fillMap[p.type] || '#ffffff'; ctx.fill();
    p.x += p.dx; p.y += p.dy;
    if (p.x < ring.x + p.size || p.x > ring.x + ring.width - p.size) p.dx *= -1;
    if (p.y < ring.y + p.size || p.y > ring.y + ring.height - p.size) p.dy *= -1;
    p.life--; if (p.life <= 0) powerUps.splice(i, 1);
  }
}

// ========== INTRUSOS ==========
let intruders = [];
function spawnIntruder() {
  if (intruders.length >= MAX_INTRUDERS) return;
  const fromLeft = Math.random() > 0.5; const y = ring.y + 30 + Math.random() * (ring.height - 60); const spd = 1.2 + Math.random() * 1.1;
  intruders.push({ x: fromLeft ? ring.x - 20 : ring.x + ring.width + 20, y: y, dx: fromLeft ? spd : -spd, dy: (Math.random() - 0.5) * 0.6, size: 12, life: 120 + Math.floor(Math.random() * 200) });
}
function drawIntruders() {
  for (let i = intruders.length - 1; i >= 0; i--) {
    const it = intruders[i];
    ctx.beginPath(); ctx.arc(it.x, it.y, it.size, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,110,110,0.95)'; ctx.fill();
    ctx.beginPath(); ctx.arc(it.x + (it.dx > 0 ? 4 : -4), it.y - 6, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,230,180,0.9)'; ctx.fill();
    it.x += it.dx; it.y += it.dy;
    if (it.y < ring.y + it.size) it.dy = Math.abs(it.dy);
    if (it.y > ring.y + ring.height - it.size) it.dy = -Math.abs(it.dy);
    it.life--;
    if (it.x < ring.x - 20) { if (defenderMode) { p1Score = Math.max(0, p1Score - 1); updateScore(); spawnFruitExplosion(it.x, it.y); playPoint(); } intruders.splice(i, 1); continue; }
    if (it.x > ring.x + ring.width + 20) { if (defenderMode) { p2Score = Math.max(0, p2Score - 1); updateScore(); spawnFruitExplosion(it.x, it.y); playPoint(); } intruders.splice(i, 1); continue; }
    if (it.life <= 0) intruders.splice(i, 1);
  }
}

// ========== VERIFICACIÓN DE COLISIONES ==========
function checkPlayerPowerCollision(player, opponent) {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    if (player.x < p.x + p.size && player.x + player.w > p.x - p.size && player.y < p.y + p.size && player.y + player.h > p.y - p.size) {
      applyPowerToPlayer(player, opponent, p.type); powerUps.splice(i, 1); playPower();
      powerupsCollected++;
    }
  }
}
function applyPowerToPlayer(player, opponent, type) {
  player.power = true;
  if (type === 'speed') { player.speed = 8; setTimeout(() => { player.speed = 5; player.power = false; }, 6000); }
  else if (type === 'slowIntruders') { intruders.forEach(it => it.dx *= 0.45); setTimeout(() => { intruders.forEach(it => it.dx *= (1 / 0.45)); player.power = false; }, 7000); }
  else if (type === 'shield') { player.hasShield = true; setTimeout(() => { player.hasShield = false; player.power = false; }, 7000); }
  else if (type === 'enlargePaddle') { player.h = 130; setTimeout(() => { player.h = player.originalH; player.power = false; }, 8000); }
  else if (type === 'shrinkPaddle') { opponent.h = 50; setTimeout(() => { opponent.h = opponent.originalH; }, 8000); }
  else if (type === 'invisibleBall') { balls.forEach(b => b.invisible = true); setTimeout(() => { balls.forEach(b => b.invisible = false); player.power = false; }, 5000); }
  else if (type === 'freezeOpponent') { opponent.frozen = true; setTimeout(() => { opponent.frozen = false; }, 4000); }
}

// ========== MODO HACKER ==========
let clones = [];
let cloneLimit = MAX_CLONES;
let hackerCooldowns = { timeSlow: 0, reverse: 0, gravity: 0, clone: 0 };
const HCOOLDOWN = 900;

function activateTimeSlow() { if (hackerCooldowns.timeSlow > 0) return false; hackerCooldowns.timeSlow = HCOOLDOWN; balls.forEach(b => b.speedMul *= 0.55); setTimeout(() => { balls.forEach(b => b.speedMul *= (1 / 0.55)); }, 4700); spawnSacredPattern('time'); tone(320, 0.35, 'sine', 0.08); return true; }
function activateReverse() { if (hackerCooldowns.reverse > 0) return false; hackerCooldowns.reverse = HCOOLDOWN; balls.forEach(b => { b.dx *= -1; b.dy *= -1; }); spawnSacredPattern('reverse'); tone(420, 0.26, 'sawtooth', 0.08); return true; }
function activateGravityFlip() { if (hackerCooldowns.gravity > 0) return false; hackerCooldowns.gravity = HCOOLDOWN; gravityFlipped = true; spawnSacredPattern('gravity'); tone(260, 0.34, 'sine', 0.08); setTimeout(() => { gravityFlipped = false; }, 5200); return true; }
function activateClone() {
  if (hackerCooldowns.clone > 0 || clones.length >= cloneLimit) return false; hackerCooldowns.clone = HCOOLDOWN;
  const template = balls[0];
  if (!template) return false;
  const c = new Ball();
  c.x = template.x + 10; c.y = template.y + 6; c.dx = -template.dx * 0.8; c.dy = template.dy * 0.9; c.speedMul = template.speedMul; clones.push(c);
  setTimeout(() => { clones = clones.filter(cl => cl !== c); }, 6000);
  spawnSacredPattern('clone'); tone(720, 0.22, 'triangle', 0.07); return true;
}

let sacredPatterns = [];
function spawnSacredPattern(kind) {
  const cx = ring.x + ring.width / 2 + (Math.random() * 120 - 60);
  const cy = ring.y + ring.height / 2 + (Math.random() * 80 - 40);
  sacredPatterns.push({ cx, cy, kind, life: 120 + Math.floor(Math.random() * 80), phase: Math.random() * Math.PI * 2 });
  if (sacredPatterns.length > 6) sacredPatterns.shift();
}
function drawSacredPatterns() {
  for (let i = sacredPatterns.length - 1; i >= 0; i--) {
    const p = sacredPatterns[i];
    const prog = p.life / 160;
    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate((Date.now() / 1000) * (p.kind === 'time' ? 0.3 : 0.8));
    const rings = p.kind === 'clone' ? 6 : 8;
    for (let r = 0; r < rings; r++) {
      const rad = 12 + r * 12 * (1 + (1 - prog) * 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${(r * 40 + Date.now() / 40) % 360},80%,60%,${0.08 + 0.3 * (1 - prog)})`;
      ctx.lineWidth = 1 + (r % 2);
      ctx.stroke();
      if (p.kind === 'reverse' || p.kind === 'gravity') {
        for (let t = 0; t < 3; t++) {
          ctx.save(); ctx.rotate((t / 3) * Math.PI * 2 + Date.now() / 2000);
          ctx.beginPath(); ctx.moveTo(rad, 0); ctx.lineTo(rad - 8, -6); ctx.lineTo(rad - 8, 6); ctx.closePath();
          ctx.fillStyle = `hsla(${(r * 60) % 360},80%,60%,${0.06 + 0.25 * (1 - prog)})`;
          ctx.fill(); ctx.restore();
        }
      }
    }
    ctx.restore();
    p.life--; if (p.life <= 0) sacredPatterns.splice(i, 1);
  }
}

let gravityFlipped = false;

// ========== ESTADO DEL MUNDO ==========
let balls = [new Ball()];
const player1 = new Paddle(ring.x + 10, ring.y + ring.height / 2 - 45);
const player2 = new Paddle(ring.x + ring.width - 22, ring.y + ring.height / 2 - 45);

// ========== ENTRADA ==========
const keys = {};
window.addEventListener('keydown', e => {
  if (currentState !== GameState.PLAYING) return;

  keys[e.key] = true;
  if (e.key === 'm' || e.key === 'M') { defenderMode = !defenderMode; modeBadge.textContent = 'Modo: ' + (defenderMode ? 'Defensor' : 'Normal'); }
  if (e.key === 'p' || e.key === 'P') { togglePause(); }
  if (e.key === 'h' || e.key === 'H') { hackerMode = !hackerMode; hint.textContent = hackerMode ? 'Modo Supremo: Activado' : 'Modo Supremo: Desactivado'; modeBadge.textContent = hackerMode ? 'Modo: Supremo' : (defenderMode ? 'Modo: Defensor' : 'Modo: Normal'); playPower(); }

  if (hackerMode && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
    if (e.key === '1') { const ok = activateTimeSlow(); if (!ok) tone(180, 0.12, 'sine', 0.06); }
    if (e.key === '2') { const ok = activateReverse(); if (!ok) tone(180, 0.12, 'sine', 0.06); }
    if (e.key === '3') { const ok = activateGravityFlip(); if (!ok) tone(180, 0.12, 'sine', 0.06); }
    if (e.key === '4') { const ok = activateClone(); if (!ok) tone(180, 0.12, 'sine', 0.06); }
  }
});
window.addEventListener('keyup', e => keys[e.key] = false);

// ========== PUNTUACIÓN Y RING ==========
function updateScore() {
  player1ScoreDiv.innerText = p1Score;
  player2ScoreDiv.innerText = p2Score;
  player1ScoreDiv.style.transform = 'scale(1.14)';
  player2ScoreDiv.style.transform = 'scale(1.14)';
  player1ScoreDiv.style.color = `hsl(${Math.random() * 360},80%,68%)`;
  player2ScoreDiv.style.color = `hsl(${Math.random() * 360},80%,68%)`;
  setTimeout(() => {
    player1ScoreDiv.style.transform = 'scale(1)';
    player2ScoreDiv.style.transform = 'scale(1)';
  }, 160);
}

function checkWinCondition() {
  if (p1Score >= WINNING_SCORE || p2Score >= WINNING_SCORE) {
    endGame();
  }
}

function drawRing() {
  ring.glow += ring.glowDir; if (ring.glow > 0.6 || ring.glow < 0.08) ring.glowDir *= -1;
  ctx.strokeStyle = `hsla(${(balls[0].x / 8) % 360},80%,70%,${ring.glow})`;
  ctx.lineWidth = 4; ctx.shadowColor = 'rgba(0,255,255,0.18)'; ctx.shadowBlur = 16;
  ctx.strokeRect(ring.x, ring.y, ring.width, ring.height); ctx.shadowBlur = 0;
}

// ========== TEMPORIZADORES DE APARICIÓN ==========
let powerTimer = 0, intruderTimer = 0;

// ========== HUD ==========
function drawHUD() {
  const px = ring.x + 8;
  const py = ring.y - 54;

  ctx.save();
  ctx.font = '12px Courier New';
  ctx.fillStyle = 'rgba(200,240,255,0.7)';
  ctx.fillText('Modo Supremo', px, py);

  const entries = [
    { k: 'timeSlow', label: '1 Ralentizar' },
    { k: 'reverse', label: '2 Invertir' },
    { k: 'gravity', label: '3 Gravedad' },
    { k: 'clone', label: '4 Clonar' }
  ];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const cd = Math.max(0, Math.floor(hackerCooldowns[e.k] / 60));

    const barX = px;
    const barY = py + 18 + i * 16;
    const barWidth = 100;
    const barHeight = 12;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY - 10, barWidth, barHeight);

    const progress = 1 - (hackerCooldowns[e.k] / HCOOLDOWN);
    ctx.fillStyle = hackerCooldowns[e.k] > 0 ? 'rgba(200,80,80,0.9)' : 'rgba(144,240,180,0.98)';
    ctx.fillRect(barX, barY - 10, barWidth * progress, barHeight);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${e.label}`, barX + barWidth + 10, barY);
  }

  ctx.restore();
}

// ========== BUCLE PRINCIPAL ==========
function loop() {
  if (currentState !== GameState.PLAYING || paused) return;

  ctx.fillStyle = 'rgba(6,12,28,1)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); g.addColorStop(0, 'rgba(8,12,30,0.06)'); g.addColorStop(1, 'rgba(8,18,30,0.06)'); ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawStars();

  if ((keys['w'] || keys['W'])) player1.move('up');
  if ((keys['s'] || keys['S'])) player1.move('down');

  if (gameMode === '2P') {
    if (keys['ArrowUp']) player2.move('up');
    if (keys['ArrowDown']) player2.move('down');
  } else {
    const settings = difficultySettings[difficulty];
    if (!keys['ArrowUp'] && !keys['ArrowDown'] && !player2.frozen) {
      const targetY = balls[0].y - player2.h / 2; const dy = targetY - player2.y;
      if (Math.abs(dy) > 8) player2.y += Math.sign(dy) * settings.aiSpeed;
      else player2.y += dy * settings.aiReaction;
      if (player2.y < ring.y) player2.y = ring.y;
      if (player2.y + player2.h > ring.y + ring.height) player2.y = ring.y + ring.height - player2.h;
    }
  }

  if (defenderMode) {
    if (powerTimer++ > 700) { spawnPower(); powerTimer = 0; }
    if (intruderTimer++ > 420) { spawnIntruder(); intruderTimer = 0; }
  } else {
    const settings = difficultySettings[difficulty];
    if (intruderTimer++ > settings.intruderFreq) { if (Math.random() < 0.2) spawnIntruder(); intruderTimer = 0; }
  }

  drawRing();
  player1.draw(); player2.draw();

  const allBalls = balls.concat(clones);
  for (const b of allBalls) { if (gravityFlipped) b.dy = -Math.abs(b.dy) * (b.dy > 0 ? 1 : -1); b.update(player1, player2); b.draw(); }

  drawPowerUps();
  drawIntruders();
  checkPlayerPowerCollision(player1, player2);
  checkPlayerPowerCollision(player2, player1);

  drawSacredPatterns();
  drawWaves();
  drawFruits();

  drawHUD();

  modeBadge.textContent = hackerMode ? 'Modo: Supremo' : (defenderMode ? 'Modo: Defensor' : 'Modo: Normal');
  hint.textContent = hackerMode ? 'Modo Supremo: Activado' : (paused ? 'PAUSADO' : 'Modo Supremo: Desactivado');

  speedIndicator.textContent = `Velocidad: ${balls[0].speedMul.toFixed(1)}x`;

  for (const k in hackerCooldowns) if (hackerCooldowns[k] > 0) hackerCooldowns[k]--;

  requestAnimationFrame(loop);
}

// ========== GESTIÓN DE ESTADOS ==========
function showScreen(screen) {
  [menuScreen, gameScreen, gameOverScreen].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

function startGame(mode) {
  gameMode = mode;
  currentState = GameState.PLAYING;

  // Actualizar etiquetas de jugador según el modo
  if (mode === '1P') {
    player1Label.textContent = 'Jugador';
    player2Label.textContent = 'IA';
  } else {
    player1Label.textContent = 'Jugador 1';
    player2Label.textContent = 'Jugador 2';
  }

  p1Score = 0;
  p2Score = 0;
  maxBallSpeed = 1;
  powerupsCollected = 0;
  paused = false;
  defenderMode = false;
  hackerMode = false;

  balls = [new Ball()];
  clones = [];
  powerUps = [];
  intruders = [];
  fruits = [];
  waves = [];
  sacredPatterns = [];

  player1.y = ring.y + ring.height / 2 - 45;
  player2.y = ring.y + ring.height / 2 - 45;
  player1.h = 90;
  player2.h = 90;
  player1.speed = 5;
  player2.speed = 5;
  player1.frozen = false;
  player2.frozen = false;
  player1.power = false;
  player2.power = false;
  player1.hasShield = false;
  player2.hasShield = false;

  hackerCooldowns = { timeSlow: 0, reverse: 0, gravity: 0, clone: 0 };

  updateScore();
  showScreen(gameScreen);

  if (window.innerWidth <= 600) {
    touchControls.classList.add('active');
  }

  if (!isMuted) {
    initBackgroundMusic();
  }

  requestAnimationFrame(loop);
}

function togglePause() {
  paused = !paused;
  if (paused) {
    hint.textContent = 'PAUSADO';
    pauseBackgroundMusic();
  } else {
    hint.textContent = hackerMode ? 'Modo Supremo: Activado' : 'Modo Supremo: Desactivado';
    resumeBackgroundMusic();
    requestAnimationFrame(loop);
  }
}

function endGame() {
  currentState = GameState.GAMEOVER;
  playVictory();

  stopBackgroundMusic();

  const winner = p1Score > p2Score ? 1 : 2;
  winnerText.textContent = winner === 1 ? '¡VICTORIA JUGADOR 1!' : '¡VICTORIA JUGADOR 2!';
  winnerSubtext.textContent = `Jugador ${winner} Gana`;
  finalScore.textContent = `${p1Score} - ${p2Score}`;
  maxSpeedDisplay.textContent = `${maxBallSpeed.toFixed(1)}x`;
  powerupsCollectedDisplay.textContent = powerupsCollected;

  saveRecord(1, p1Score);
  saveRecord(2, p2Score);

  showScreen(gameOverScreen);
}

// ========== ESCUCHADORES DE EVENTOS ==========
btn1Player.addEventListener('click', () => startGame('1P'));
btn2Player.addEventListener('click', () => startGame('2P'));

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.difficulty;
  });
});

btnPlayAgain.addEventListener('click', () => startGame(gameMode));
btnBackToMenu.addEventListener('click', () => {
  currentState = GameState.MENU;
  stopBackgroundMusic();
  showScreen(menuScreen);
});

btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

btnMute.addEventListener('click', () => {
  isMuted = !isMuted;
  btnMute.textContent = isMuted ? '🔇' : '🔊';

  if (isMuted) {
    pauseBackgroundMusic();
  } else if (currentState === GameState.PLAYING) {
    resumeBackgroundMusic();
  }
});

btnChangeMusic.addEventListener('click', () => {
  if (currentState === GameState.PLAYING) {
    changeBackgroundMusic();
  }
});

btnMenu.addEventListener('click', () => {
  if (currentState === GameState.PLAYING) {
    currentState = GameState.MENU;
    stopBackgroundMusic();
    showScreen(menuScreen);
  }
});

touchUpLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys['w'] = true; });
touchUpLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys['w'] = false; });
touchDownLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys['s'] = true; });
touchDownLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys['s'] = false; });

touchUpRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowUp'] = true; });
touchUpRight.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowUp'] = false; });
touchDownRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys['ArrowDown'] = true; });
touchDownRight.addEventListener('touchend', (e) => { e.preventDefault(); keys['ArrowDown'] = false; });

window.addEventListener('blur', () => {
  if (currentState === GameState.PLAYING && !paused) {
    togglePause();
  }
});

// ========== INICIALIZACIÓN ==========
loadRecords();
showScreen(menuScreen);
