// ===== Canvas & HUD =====
const canvas  = document.getElementById("board");
const ctx     = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl  = document.getElementById("best");

// ===== Grid & Speed (constant, Nokia style) =====
const CELL = 21;                                   // px per cell
const COLS = Math.floor(canvas.width / CELL);
const ROWS = Math.floor(canvas.height / CELL);
let   speedMs = 240;                               // CONSTANT speed; tweak here (ms per step)

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

// Draw one rounded cell with fallback if roundRect not supported
function drawCell(cx, cy, color) {
  const pad = 3;
  const x = cx * CELL + pad;
  const y = cy * CELL + pad;
  const w = CELL - 2 * pad;
  const h = CELL - 2 * pad;
  const r = 6;

  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,.25)";
  ctx.lineWidth = 1;

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

  // Food (3D bead look: base + highlight)
  drawCell(food.x, food.y, "#22c55e");
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL * 0.58, food.y * CELL + CELL * 0.42, 3.2, 0, Math.PI*2);
  ctx.fill();

  // Snake (head vivid, body lighter)
  snake.forEach((seg, i) => {
    const color = i === 0 ? "#7c5cff" : "#a9b1ff";
    drawCell(seg.x, seg.y, color);
    // tiny head gloss
    if (i === 0) {
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.beginPath();
      ctx.arc(seg.x * CELL + CELL * 0.58, seg.y * CELL + CELL * 0.38, 3, 0, Math.PI*2);
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
  drawAll();  // show idle board & snake (game waits for Start)
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
  pause(); reset(); // stays idle until Start again
}
function loop() {
  timer = setTimeout(() => {
    step();
    if (running) loop();
  }, speedMs);
}
function step() {
  // 1) apply next direction
  dir = nextDir;

  // 2) new head
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // 3) Nokia wrap (edges connect). For hard walls, remove wrap & add wall-collision.
  head.x = (head.x + COLS) % COLS;
  head.y = (head.y + ROWS) % ROWS;

  // 4) self-collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

  // 5) move
  snake.unshift(head);

  // 6) food?
  if (head.x === food.x && head.y === food.y) {
    score++;
    updateHUD();
    placeFood();
  } else {
    snake.pop();
  }

  // 7) draw
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

// ===== Inputs =====
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === " ") { running ? pause() : start(); return; }
  if (k === "r") { restart(); return; }

  if (["arrowup","w"].includes(k)    && dir.y !== 1)  nextDir = {x:0,y:-1};
  if (["arrowdown","s"].includes(k)  && dir.y !== -1) nextDir = {x:0,y:1};
  if (["arrowleft","a"].includes(k)  && dir.x !== 1)  nextDir = {x:-1,y:0};
  if (["arrowright","d"].includes(k) && dir.x !== -1) nextDir = {x:1,y:0};
});

document.querySelectorAll(".pad3d").forEach(b=>{
  b.addEventListener("click", ()=>{
    const d = b.dataset.dir;
    if (d==="up" && dir.y !== 1)    nextDir={x:0,y:-1};
    if (d==="down" && dir.y !== -1) nextDir={x:0,y:1};
    if (d==="left" && dir.x !== 1)  nextDir={x:-1,y:0};
    if (d==="right" && dir.x !== -1)nextDir={x:1,y:0};
    // auto-start when pressing a direction on touch controls
    if (!running && !over) start();
  });
});

// simple swipe controls on the canvas
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
    if (dx > 0 && dir.x !== -1) nextDir = {x:1,y:0};
    else if (dx < 0 && dir.x !== 1) nextDir = {x:-1,y:0};
  } else {
    if (dy > 0 && dir.y !== -1) nextDir = {x:0,y:1};
    else if (dy < 0 && dir.y !== 1) nextDir = {x:0,y:-1};
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
reset(); // Do NOT auto start; waits for Start
