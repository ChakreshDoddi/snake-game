// ===== Canvas & HUD =====
const canvas  = document.getElementById("board");
const ctx     = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl  = document.getElementById("best");

// ===== Grid & Speed (constant, Nokia style) =====
const COLS = 21;                     // logical grid is 21 x 21 (fixed)
const ROWS = 21;
let   CELL = 21;                     // pixel size per cell (computed on resize)
let   speedMs = 240;                 // constant speed (ms per step)

// ===== Responsive canvas =====
function resizeCanvas() {
  // match CSS layout size; keep a perfect square
  const size = Math.min(canvas.clientWidth, canvas.clientHeight || canvas.clientWidth);
  canvas.width  = size;
  canvas.height = size;
  CELL = canvas.width / COLS;        // recompute pixel cell size after resize
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // initial

// ===== State =====
let snake, dir, nextDir, food, score, best, timer, running, over;

// ===== Helpers =====
function placeFood() {
  while (true) {
    const f = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
    if (!snake.some(s => s.x === f.x && s.y === f.y)) { food = f; return; }
  }
}
function updateHUD() {
  scoreEl.textContent = score;
  bestEl.textContent  = best;
}

// Rounded cell with fallback
function drawCell(cx, cy, color) {
  const pad = Math.max(2, CELL * 0.14);
  const x = cx * CELL + pad;
  const y = cy * CELL + pad;
  const w = CELL - 2 * pad;
  const h = CELL - 2 * pad;
  const r = Math.min(10, CELL * 0.3);

  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = Math.max(1, CELL * 0.04);

  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    ctx.stroke();
    return;
  }
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
  ctx.fill();
  ctx.stroke();
}

function drawAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Food (3D bead)
  drawCell(food.x, food.y, "#22c55e");
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL * 0.58, food.y * CELL + CELL * 0.42, Math.max(2, CELL * 0.15), 0, Math.PI * 2);
  ctx.fill();

  // Snake
  snake.forEach((seg, i) => {
    const color = i === 0 ? "#7c5cff" : "#a9b1ff";
    drawCell(seg.x, seg.y, color);
    if (i === 0) {
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.beginPath();
      ctx.arc(seg.x * CELL + CELL * 0.58, seg.y * CELL + CELL * 0.38, Math.max(2, CELL * 0.14), 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// ===== Game Core =====
function reset() {
  snake = [{ x: Math.floor(COLS/2), y: Math.floor(ROWS/2) }];
  dir = { x: 1, y: 0 };
  nextDir = { ...dir };
  score = 0;
  over = false;
  running = false;
  placeFood();
  updateHUD();
  drawAll();  // idle view until Start
}
function start() {
  if (running || over) return;
  running = true;
  loop();
}
function pause() {
  running = false;
  clearTimeout(timer);
}
function restart() {
  pause();
  reset(); // remains idle until Start
}
function loop() {
  timer = setTimeout(() => {
    step();
    if (running) loop();
  }, speedMs);
}
function step() {
  // apply next direction
  dir = nextDir;

  // new head
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Nokia wrap
  head.x = (head.x + COLS) % COLS;
  head.y = (head.y + ROWS) % ROWS;

  // self-collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

  // move
  snake.unshift(head);

  // eat?
  if (head.x === food.x && head.y === food.y) {
    score++;
    updateHUD();
    placeFood();
  } else {
    snake.pop();
  }

  drawAll();
}
function gameOver() {
  over = true;
  pause();
  if (score > best) {
    best = score;
    localStorage.setItem("snake-best", best);
  }
  updateHUD();
}

// ===== D-pad highlight helper =====
function flashArrow(dir){
  const btn = document.querySelector(`.pad3d[data-dir="${dir}"]`);
  if (!btn) return;
  btn.classList.add("active");
  setTimeout(()=>btn.classList.remove("active"), 150);
}

// ===== Inputs =====
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  // prevent page scroll on arrows/space
  if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"," ","r"].includes(k)) {
    e.preventDefault();
  }

  if (k === " ") { running ? pause() : start(); return; }
  if (k === "r") { restart(); return; }

  if (["arrowup","w"].includes(k)    && dir.y !== 1)  { nextDir = {x:0,y:-1}; flashArrow("up"); }
  if (["arrowdown","s"].includes(k)  && dir.y !== -1) { nextDir = {x:0,y:1};  flashArrow("down"); }
  if (["arrowleft","a"].includes(k)  && dir.x !== 1)  { nextDir = {x:-1,y:0}; flashArrow("left"); }
  if (["arrowright","d"].includes(k) && dir.x !== -1) { nextDir = {x:1,y:0};  flashArrow("right"); }

  // optional: start when first direction key pressed
  if (!running && !over &&
      ["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)) {
    start();
  }
});

document.querySelectorAll(".pad3d").forEach(b=>{
  b.addEventListener("click", ()=>{
    const d = b.dataset.dir;
    if (d==="up" && dir.y !== 1)    nextDir={x:0,y:-1};
    if (d==="down" && dir.y !== -1) nextDir={x:0,y:1};
    if (d==="left" && dir.x !== 1)  nextDir={x:-1,y:0};
    if (d==="right" && dir.x !== -1)nextDir={x:1,y:0};
    flashArrow(d);
    if (!running && !over) start();
  });
});

// swipe controls
let touchStart = null;
canvas.addEventListener("touchstart", e=>{
  const t = e.touches[0]; touchStart = {x:t.clientX, y:t.clientY};
},{passive:true});
canvas.addEventListener("touchmove", e=>{
  if (!touchStart) return;
  const t = e.touches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.abs(dx) + Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && dir.x !== -1) nextDir = {x:1,y:0}, flashArrow("right");
    else if (dx < 0 && dir.x !== 1) nextDir = {x:-1,y:0}, flashArrow("left");
  } else {
    if (dy > 0 && dir.y !== -1) nextDir = {x:0,y:1}, flashArrow("down");
    else if (dy < 0 && dir.y !== 1) nextDir = {x:0,y:-1}, flashArrow("up");
  }
  touchStart = null;
  if (!running && !over) start();
},{passive:true});

// Menu buttons
document.getElementById("btnStart").addEventListener("click", () => {
  if (!running && !over) start();
});
document.getElementById("btnRestart").addEventListener("click", () => {
  restart();
});
document.getElementById("btnPause").addEventListener("click", () => {
  running ? pause() : start();
});

// ===== Boot =====
best = parseInt(localStorage.getItem("snake-best") || "0", 10);
reset(); // waits for Start

