const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const TILE_SIZE = 32;
const MAP_ROWS = 100;
const MAP_COLS = 100;

const images = {
    grass: new Image(),
    grass_t: new Image(),
    grass_b: new Image(),
    grass_l: new Image(),
    grass_r: new Image(),
    player: new Image(),
    water: new Image(),
};

images.grass.src = 'assets/images/bg/grass.png';
images.grass_t.src = 'assets/images/bg/grass_t.png';
images.grass_b.src = 'assets/images/bg/grass_b.png';
images.grass_l.src = 'assets/images/bg/grass_l.png';
images.grass_r.src = 'assets/images/bg/grass_r.png';
images.player.src = 'assets/images/character/south/frame_000.png';
images.water.src = 'assets/images/bg/water.png';

const player = {
    x: (MAP_COLS * TILE_SIZE) / 2,
    y: (MAP_ROWS * TILE_SIZE) / 2,
    width: 32,
    height: 32,
    speed: 5,
};

const camera = {
    x: 0,
    y: 0,
};

const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

const map = [];
let time = 0;

function generateMap() {
    const h = MAP_COLS / 2;
    const k = MAP_ROWS / 2;
    const a = MAP_COLS / 2 - 10;
    const b = MAP_ROWS / 2 - 10;

    for (let row = 0; row < MAP_ROWS; row++) {
        map[row] = [];
        for (let col = 0; col < MAP_COLS; col++) {
            const dx = col - h;
            const dy = row - k;
            const isWater = (dx * dx) / (a * a) + (dy * dy) / (b * b) > 1;

            if (isWater) {
                map[row][col] = 'water';
            } else {
                map[row][col] = 'grass';
            }
        }
    }
}

function isWalkable(x, y) {
    const corners = [
        { x: x, y: y }, // top-left
        { x: x + player.width - 1, y: y }, // top-right
        { x: x, y: y + player.height - 1 }, // bottom-left
        { x: x + player.width - 1, y: y + player.height - 1 } // bottom-right
    ];

    for (const corner of corners) {
        const tileX = Math.floor(corner.x / TILE_SIZE);
        const tileY = Math.floor(corner.y / TILE_SIZE);

        if (tileX < 0 || tileX >= MAP_COLS || tileY < 0 || tileY >= MAP_ROWS) {
            return false; // Out of bounds
        }

        const tile = map[tileY][tileX];
        if (tile === 'water') {
            return false;
        }
    }

    return true;
}

function drawMap() {
    // Draw base tiles
    for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
            const tile = map[row][col];
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;

            if (tile === 'water') {
                ctx.drawImage(images.water, x, y, TILE_SIZE, TILE_SIZE);
            } else if (images[tile]) {
                ctx.drawImage(images[tile], x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

function update() {
    let nextX = player.x;
    let nextY = player.y;

    if (keys.w || keys.ArrowUp) {
        nextY -= player.speed;
    }
    if (keys.s || keys.ArrowDown) {
        nextY += player.speed;
    }
    if (keys.a || keys.ArrowLeft) {
        nextX -= player.speed;
    }
    if (keys.d || keys.ArrowRight) {
        nextX += player.speed;
    }

    if (isWalkable(nextX, player.y)) {
        player.x = nextX;
    }

    if (isWalkable(player.x, nextY)) {
        player.y = nextY;
    }

    // update camera to follow player
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // clamp camera to map boundaries
    camera.x = Math.max(0, Math.min(camera.x, MAP_COLS * TILE_SIZE - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, MAP_ROWS * TILE_SIZE - canvas.height));

    time += 0.01;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // save context
    ctx.save();

    // translate to camera position
    ctx.translate(-camera.x, -camera.y);

    drawMap();
    ctx.drawImage(images.player, player.x, player.y, player.width, player.height);

    // restore context
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

const allImages = Object.values(images);
Promise.all(allImages.map(img => new Promise(resolve => img.onload = resolve))).then(() => {
    generateMap();
    gameLoop();
});