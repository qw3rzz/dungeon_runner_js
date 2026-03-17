const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const W = 1100, H = 420;
canvas.width  = W;
canvas.height = H;

const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('scoreEl');
const bestEl  = document.getElementById('bestEl');
const pauseMenu = document.getElementById('pauseMenu');

const FLOOR      = H - 75;
const CEILING    = 60;
const GRAVITY    = 0.72;
const JUMP_FORCE = -17;

let state = 'idle';
let score = 0, best = 0, frameCount = 0, speed = 5;
let obstacles = [], particles = [];
let nextObstacle = 80;
let bgOffset1 = 0, bgOffset2 = 0;

const torches = [100, 370, 640, 910].map(x => ({ x }));

const player = {
    x: 130, y: FLOOR,
    w: 44, h: 66,
    vy: 0, jumps: 0, onGround: false,
    animFrame: 0, animTimer: 0, dead: false
};

function jump() {
    if (state !== 'running') { startGame(); return; }
    if (player.jumps < 2) {
        player.vy = JUMP_FORCE;
        player.jumps++;
        spawnParticles(player.x + 22, player.y, '#c8a84b', 8);
    }
}

canvas.addEventListener('click', jump);
canvas.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); jump(); }
    if (e.code === 'Escape') { togglePause(); }  // ← přidej tento řádek
});

function startGame() {
    state = 'running'; score = 0; frameCount = 0; speed = 5;
    obstacles = []; particles = []; nextObstacle = 90;
    player.y = FLOOR; player.vy = 0; player.jumps = 0;
    player.dead = false; player.animFrame = 0;
    overlay.style.display = 'none';
}

function killPlayer() {
    state = 'dead'; player.dead = true;
    spawnParticles(player.x + 22, player.y - 33, '#c0392b', 22);
    if (score > best) best = score;
    setTimeout(() => {
        overlay.innerHTML = `
      <h1>You died.</h1>
      <p class="score-display">SCORE:: ${score}</p>
      <p class="best-display">YOUR BEST:: ${best}</p>
      <p class="blink">[ SPACE / MOUSE CLICK — RETRY ]</p>`;
        overlay.style.display = 'flex';
    }, 600);
}

function togglePause() {
    if (state === 'idle' || state === 'dead') return; // v menu ESC nedělá nic

    if (state === 'running') {
        state = 'paused';
        pauseMenu.style.display = 'flex';
    } else if (state === 'paused') {
        state = 'running';
        pauseMenu.style.display = 'none';
    }
}

function spawnParticles(x, y, color, n) {
    for (let i = 0; i < n; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 7,
            vy: (Math.random() - 0.5) * 7 - 2,
            life: 1, color
        });
    }
}

function spawnObstacle() {
    const r = Math.random();
    if (r < 0.45) {
        // Spikes on floor
        const count = 1 + Math.floor(Math.random() * 3);
        obstacles.push({ type: 'spike', x: W + 20, count, w: count * 28, h: 50 });
    } else if (r < 0.72) {
        // Flying bat
        const y = CEILING + 40 + Math.random() * (FLOOR - CEILING - 160);
        obstacles.push({ type: 'bat', x: W + 20, y, w: 52, h: 30, animF: 0 });
    } else {
        // Barrel on floor
        obstacles.push({ type: 'barrel', x: W + 20, w: 44, h: 54 });
    }
}

function obstacleY(o) {
    if (o.type === 'bat') return o.y;
    return FLOOR - o.h;
}

function drawSkeleton(px, py, dead) {
    const c = dead ? '#7a3333' : '#e8e0d0';
    ctx.save();
    if (dead) {
        ctx.translate(px + 22, py + 33);
        ctx.rotate(Math.PI / 2);
        ctx.translate(-(px + 22), -(py + 33));
    }
    ctx.fillStyle = c;
    // Skull
    ctx.fillRect(px + 10, py,      24, 20);
    ctx.fillStyle = '#0d0b0f';
    ctx.fillRect(px + 14, py + 6,  6, 6);   // left eye
    ctx.fillRect(px + 24, py + 6,  6, 6);   // right eye
    ctx.fillRect(px + 16, py + 15, 3, 3);   // nose
    ctx.fillRect(px + 21, py + 15, 3, 3);
    ctx.fillStyle = c;
    ctx.fillRect(px + 13, py + 18, 18, 4);  // teeth row
    ctx.fillStyle = '#0d0b0f';
    ctx.fillRect(px + 15, py + 18, 3, 4);
    ctx.fillRect(px + 20, py + 18, 3, 4);
    ctx.fillRect(px + 25, py + 18, 3, 4);
    ctx.fillStyle = c;
    // Spine
    ctx.fillRect(px + 20, py + 22, 6, 21);
    // Ribs
    ctx.fillRect(px + 7,  py + 23, 13, 5);
    ctx.fillRect(px + 26, py + 23, 13, 5);
    ctx.fillRect(px + 8,  py + 31, 11, 5);
    ctx.fillRect(px + 27, py + 31, 11, 5);
    // Pelvis
    ctx.fillRect(px + 10, py + 43, 24, 6);
    // Legs (animated)
    const ls = Math.sin(player.animFrame * 0.4) * 5;
    ctx.fillRect(px + 12, py + 49, 7, 12 + ls);
    ctx.fillRect(px + 25, py + 49, 7, 12 - ls);
    ctx.fillRect(px + 11, py + 61 + ls, 8, 5);
    ctx.fillRect(px + 25, py + 61 - ls, 8, 5);
    // Arms (animated)
    const as2 = Math.sin(player.animFrame * 0.4) * 6;
    ctx.fillRect(px + 1,  py + 23 + as2, 9, 5);
    ctx.fillRect(px + 34, py + 23 - as2, 9, 5);
    ctx.restore();
}

function drawSpike(o) {
    const sy = FLOOR - o.h;
    for (let i = 0; i < o.count; i++) {
        const sx = o.x + i * 28;
        ctx.fillStyle = '#8a8098';
        ctx.beginPath();
        ctx.moveTo(sx, FLOOR);
        ctx.lineTo(sx + 14, sy);
        ctx.lineTo(sx + 28, FLOOR);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ccbbd8';
        ctx.beginPath();
        ctx.moveTo(sx + 11, FLOOR - 8);
        ctx.lineTo(sx + 14, sy);
        ctx.lineTo(sx + 17, FLOOR - 8);
        ctx.closePath();
        ctx.fill();
    }
}

function drawBat(o) {
    o.animF += 0.15;
    const wing = Math.sin(o.animF) * 14;
    ctx.fillStyle = '#7755bb';
    ctx.beginPath();
    ctx.ellipse(o.x + 26, o.y + 15, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(o.x + 14, o.y + 15);
    ctx.lineTo(o.x, o.y + 15 + wing);
    ctx.lineTo(o.x + 8, o.y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(o.x + 38, o.y + 15);
    ctx.lineTo(o.x + 52, o.y + 15 + wing);
    ctx.lineTo(o.x + 44, o.y + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff3355';
    ctx.fillRect(o.x + 20, o.y + 10, 5, 5);
    ctx.fillRect(o.x + 29, o.y + 10, 5, 5);
}

function drawBarrel(o) {
    const by = FLOOR - o.h;
    ctx.fillStyle = '#7a4f1e';
    ctx.fillRect(o.x, by, o.w, o.h);
    ctx.fillStyle = '#9b6623';
    ctx.fillRect(o.x + 3, by + 3, o.w - 6, 8);
    ctx.fillRect(o.x + 3, by + o.h - 11, o.w - 6, 8);
    ctx.fillStyle = '#444';
    ctx.fillRect(o.x, by + 11, o.w, 4);
    ctx.fillRect(o.x, by + o.h - 15, o.w, 4);
    ctx.fillStyle = '#e8e0d0';
    ctx.font = 'bold 22px serif';
    ctx.fillText('☠', o.x + 9, by + 36);
}

function drawTorch(tx, flicker) {
    ctx.fillStyle = '#332838';
    ctx.fillRect(tx - 6, CEILING, 12, 24);
    const f = flicker * 6;
    const grad = ctx.createRadialGradient(tx, CEILING + 12, 1, tx, CEILING + 18, 22 + f);
    grad.addColorStop(0,   '#fffbe0');
    grad.addColorStop(0.3, '#f5a623');
    grad.addColorStop(0.7, 'rgba(192,57,43,0.5)');
    grad.addColorStop(1,   'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(tx, CEILING + 12, 12 + f * 0.5, 22 + f * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    const lg = ctx.createRadialGradient(tx, CEILING, 0, tx, CEILING, 80);
    lg.addColorStop(0, 'rgba(245,166,35,0.15)');
    lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg;
    ctx.fillRect(tx - 80, 0, 160, CEILING + 30);
}

function update() {
    if (state !== 'running') return;
    frameCount++;
    score = Math.floor(frameCount / 6);
    speed = 5 + frameCount / 900; // Zrychlování hry

    // Player Physics
    player.vy += GRAVITY;
    player.y  += player.vy;
    if (player.y >= FLOOR) {
        player.y = FLOOR; player.vy = 0; player.jumps = 0; player.onGround = true;
    } else {
        player.onGround = false;
    }

    if (player.onGround) {
        player.animTimer++;
        if (player.animTimer > 6) { player.animFrame++; player.animTimer = 0; }
    }

    // Parallax background
    bgOffset1 = (bgOffset1 + speed * 0.3) % W;
    bgOffset2 = (bgOffset2 + speed * 0.8) % W;
    for (const t of torches) {
        t.x -= speed * 0.5;
        if (t.x < -20) t.x += W + 40;
    }

    // Spawn obstacles
    nextObstacle--;
    if (nextObstacle <= 0) {
        spawnObstacle();
        nextObstacle = 55 + Math.random() * 65 - Math.min(frameCount / 220, 28);
    }

    // Obstacles move (AABB)
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= speed;
        if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }

        const oy = obstacleY(o);
        const px = player.x + 7,       py = player.y - player.h + 6;
        const pw = player.w - 14,       ph = player.h - 12;
        if (px < o.x + o.w && px + pw > o.x &&
            py < oy + o.h  && py + ph > oy) {
            killPlayer(); return;
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.22;
        p.life -= 0.04;
        if (p.life <= 0) particles.splice(i, 1);
    }

    function update() {
        if (state !== 'running') return;
    }
}
// Graphics
function draw() {
    const flicker = Math.sin(Date.now() / 75) * 0.5 + 0.5;

    ctx.fillStyle = '#0d0b0f';
    ctx.fillRect(0, 0, W, H);

    // Stone bg blocks
    ctx.fillStyle = '#141018';
    for (let i = 0; i < 12; i++) {
        const bx = ((i * 110 - bgOffset1 + W * 2) % (W + 120)) - 10;
        ctx.fillRect(bx, 0, 100, H);
    }

    // Ceiling bricks
    ctx.fillStyle = '#18141e';
    ctx.fillRect(0, 0, W, CEILING);
    ctx.fillStyle = '#211c28';
    for (let i = 0; i < 24; i++) {
        const bx = ((i * 52 - bgOffset2 * 0.5 + W * 2) % (W + 60)) - 10;
        ctx.fillRect(bx, 8, 46, 20);
        ctx.fillRect(bx + 26, 30, 46, 20);
    }

    for (const t of torches) drawTorch(t.x, flicker);

    // Floor bricks
    ctx.fillStyle = '#1e1828';
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = '#261f30';
    for (let i = 0; i < 24; i++) {
        const bx = ((i * 52 - bgOffset2 * 0.9 + W * 2) % (W + 60)) - 10;
        ctx.fillRect(bx, FLOOR + 4, 46, 20);
        ctx.fillRect(bx + 26, FLOOR + 26, 46, 20);
    }
    ctx.fillStyle = '#3a3045';
    ctx.fillRect(0, FLOOR, W, 5);

    for (const o of obstacles) {
        if (o.type === 'spike')  drawSpike(o);
        if (o.type === 'bat')    drawBat(o);
        if (o.type === 'barrel') drawBarrel(o);
    }

    if (!player.dead) {
        drawSkeleton(player.x, player.y - player.h, false);
    }

    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;

    if (state === 'dead') {
        const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
        v.addColorStop(0, 'transparent');
        v.addColorStop(1, 'rgba(180,20,20,0.55)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, W, H);
    }

    scoreEl.textContent = `Score: ${score}`;
    bestEl.textContent  = `Best score: ${best}`;
}

document.getElementById('btnRetry').addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    startGame();
});

document.getElementById('btnExit').addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    state = 'idle';

    overlay.innerHTML = `
    <h1>DUNGEON RUNNER</h1>
    <p class="sub">Skeleton runs through a dark dungeon<br>Jump over obstacles and survive!</p>
    <p class="sub">SPACE / CLICK — jump<br>Double jump allowed!</p>
    <p class="blink">[ PRESS SPACE ]</p>`;
    overlay.style.display = 'flex';
});

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();