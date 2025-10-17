const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameOverlay = document.getElementById('gameOverlay');
const playerNameInput = document.getElementById('playerNameInput');
const startButton = document.getElementById('startButton');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreDisplay = document.getElementById('finalScore');
const playAgainButton = document.getElementById('playAgainButton');
const gameUI = document.getElementById('gameUI');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const playerNameSpan = document.getElementById('playerName');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const gameContainer = document.getElementById('game-container');

let gameStarted = false;
const GAME_DURATION = 60; // seconds
let timeLeft = GAME_DURATION;
let score = 0;
let gameInterval;
let playerName = "Player";

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const TILE_SIZE = 32;
const OBJECT_SIZE = 48;
const MAP_ROWS = 140;
const MAP_COLS = 140;

const assets = {
    images: {
        grass: new Image(),
        grass_t: new Image(),
        grass_b: new Image(),
        grass_l: new Image(),
        grass_r: new Image(),
        water: new Image(),
        chest: new Image(),
        rock: new Image(),
        tree_lg: new Image(),
        tree_md: new Image(),
        tree_simple: new Image(),
        tree_stump_short: new Image(),
        tree_stump_tall: new Image(),
    },
    animations: {
        player: {}
    }
};

assets.images.grass.src = 'assets/images/bg/grass.png';
assets.images.grass_t.src = 'assets/images/bg/grass_t.png';
assets.images.grass_b.src = 'assets/images/bg/grass_b.png';
assets.images.grass_l.src = 'assets/images/bg/grass_l.png';
assets.images.grass_r.src = 'assets/images/bg/grass_r.png';
assets.images.water.src = 'assets/images/bg/water.png';
assets.images.chest.src = 'assets/images/bg/chest.png';
assets.images.rock.src = 'assets/images/bg/rock.png';
assets.images.tree_lg.src = 'assets/images/bg/tree_lg.png';
assets.images.tree_md.src = 'assets/images/bg/tree_md.png';
assets.images.tree_simple.src = 'assets/images/bg/tree_simple.png';
assets.images.tree_stump_short.src = 'assets/images/bg/tree_stump_short.png';
assets.images.tree_stump_tall.src = 'assets/images/bg/tree_stump_tall.png';

const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];
const framesPerDirection = 4;

function loadPlayerAnimations() {
    for (const dir of directions) {
        assets.animations.player[dir] = [];
        for (let i = 0; i < framesPerDirection; i++) {
            const img = new Image();
            img.src = `assets/images/character/${dir}/frame_00${i}.png`;
            assets.animations.player[dir].push(img);
        }
    }
}

loadPlayerAnimations();

const objects = ['rock', 'tree_lg', 'tree_md', 'tree_simple', 'tree_stump_short', 'tree_stump_tall'];
let spawnedObjects = [];
let chests = [];
let effects = [];

const player = {
    x: (MAP_COLS * TILE_SIZE) / 2,
    y: (MAP_ROWS * TILE_SIZE) / 2,
    width: 64,
    height: 64,
    speed: 3.5,
    direction: 'south',
    frame: 0,
    animationTimer: 0,
    animationSpeed: 0.1 // frames per game loop update
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

    const numObjects = 190;
    spawnedObjects = [];
    chests = [];

    for (let i = 0; i < numObjects; i++) {
        const objectName = objects[Math.floor(Math.random() * objects.length)];
        let row, col;
        let attempts = 0;

        let validPosition = false;
        while (!validPosition && attempts < 100) {
            attempts++;
            row = Math.floor(Math.random() * MAP_ROWS);
            col = Math.floor(Math.random() * MAP_COLS);

            if (map[row][col] === 'grass') {
                let tooClose = false;
                const distFromPlayerSpawn = Math.sqrt(Math.pow(row - MAP_ROWS / 2, 2) + Math.pow(col - MAP_COLS / 2, 2));
                if (distFromPlayerSpawn < 10) {
                    tooClose = true;
                } else {
                    for (const spawned of spawnedObjects) {
                        const dist = Math.sqrt(Math.pow(row - spawned.row, 2) + Math.pow(col - spawned.col, 2));
                        if (dist < 5) {
                            tooClose = true;
                            break;
                        }
                    }
                }

                if (!tooClose) {
                    validPosition = true;
                    map[row][col] = objectName;
                    spawnedObjects.push({ row, col });
                }
            }
        }
    }

    const numChests = 15;
    for (let i = 0; i < numChests; i++) {
        let row, col;
        let attempts = 0;
        let validPosition = false;
        while (!validPosition && attempts < 100) {
            attempts++;
            row = Math.floor(Math.random() * MAP_ROWS);
            col = Math.floor(Math.random() * MAP_COLS);

            if (map[row][col] === 'grass') {
                let tooClose = false;
                const distFromPlayerSpawn = Math.sqrt(Math.pow(row - MAP_ROWS / 2, 2) + Math.pow(col - MAP_COLS / 2, 2));
                if (distFromPlayerSpawn < 10) {
                    tooClose = true;
                } else {
                    for (const spawned of spawnedObjects) {
                        const dist = Math.sqrt(Math.pow(row - spawned.row, 2) + Math.pow(col - spawned.col, 2));
                        if (dist < 2) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (!tooClose) {
                        for (const chest of chests) {
                            const dist = Math.sqrt(Math.pow(row - chest.row, 2) + Math.pow(col - chest.col, 2));
                            if (dist < 5) {
                                tooClose = true;
                                break;
                            }
                        }
                    }
                }

                if (!tooClose) {
                    validPosition = true;
                    chests.push({ row, col });
                }
            }
        }
    }
}

function isWalkable(x, y) {
    const collisionWidth = player.width * 0.5;
    const collisionHeight = player.height * 0.7;
    const collisionX = x + (player.width - collisionWidth) / 2;
    const collisionY = y + (player.height - collisionHeight) / 2;

    const corners = [
        { x: collisionX, y: collisionY }, // top-left
        { x: collisionX + collisionWidth - 1, y: collisionY }, // top-right
        { x: collisionX, y: collisionY + collisionHeight - 1 }, // bottom-left
        { x: collisionX + collisionWidth - 1, y: collisionY + collisionHeight - 1 } // bottom-right
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

    const playerRect = { x: collisionX, y: collisionY, width: collisionWidth, height: collisionHeight };

    for (const obj of spawnedObjects) {
        const objRect = {
            x: obj.col * TILE_SIZE - (OBJECT_SIZE - TILE_SIZE) / 2,
            y: obj.row * TILE_SIZE - (OBJECT_SIZE - TILE_SIZE) / 2,
            width: OBJECT_SIZE,
            height: OBJECT_SIZE
        };

        if (
            playerRect.x < objRect.x + objRect.width &&
            playerRect.x + playerRect.width > objRect.x &&
            playerRect.y < objRect.y + objRect.height &&
            playerRect.y + playerRect.height > objRect.y
        ) {
            return false; // Collision with an object
        }
    }

    return true;
}

function drawMap() {
    // 1. Draw all base tiles
    for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
            const tile = map[row][col];
            const x = col * TILE_SIZE;
            const y = row * TILE_SIZE;

            if (tile === 'water') {
                ctx.drawImage(assets.images.water, x, y, TILE_SIZE, TILE_SIZE);
            } else {
                ctx.drawImage(assets.images.grass, x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // 2. Draw objects on top
    for (const obj of spawnedObjects) {
        const objectName = map[obj.row][obj.col];
        const x = obj.col * TILE_SIZE;
        const y = obj.row * TILE_SIZE;
        if (assets.images[objectName]) {
            ctx.drawImage(assets.images[objectName], x - (OBJECT_SIZE - TILE_SIZE) / 2, y - (OBJECT_SIZE - TILE_SIZE) / 2, OBJECT_SIZE, OBJECT_SIZE);
        }
    }

    // 3. Draw chests
    for (const chest of chests) {
        const x = chest.col * TILE_SIZE;
        const y = chest.row * TILE_SIZE;
        ctx.drawImage(assets.images.chest, x - (OBJECT_SIZE - TILE_SIZE) / 2, y - (OBJECT_SIZE - TILE_SIZE) / 2, OBJECT_SIZE, OBJECT_SIZE);
    }
}

function updateTimer() {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
        endGame();
    }
}

function startGame() {
    gameOverlay.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    gameContainer.style.display = 'block';
    gameUI.style.display = 'flex';

    gameStarted = true;
    timeLeft = GAME_DURATION;
    score = 0;
    timerDisplay.textContent = timeLeft;
    scoreDisplay.textContent = score;

    playerName = playerNameInput.value.trim();
    if (playerName === '') {
        playerName = 'Player';
    }
    playerNameSpan.textContent = playerName;

    // Request fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) { /* Firefox */
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) { /* IE/Edge */
        document.documentElement.msRequestFullscreen();
    }

    // Reset player position
    player.x = (MAP_COLS * TILE_SIZE) / 2;
    player.y = (MAP_ROWS * TILE_SIZE) / 2;

    // Regenerate map and objects
    generateMap();

    gameInterval = setInterval(updateTimer, 1000);
}

function endGame() {
    gameStarted = false;
    clearInterval(gameInterval);
    gameContainer.style.display = 'none';
    gameUI.style.display = 'none';
    gameOverOverlay.style.display = 'flex';
    finalScoreDisplay.textContent = score;
}

function resetGame() {
    gameOverOverlay.style.display = 'none';
    playerNameInput.value = ''; // Clear the input field
    startGame();
}

function checkChestCollision() {
    const collisionWidth = player.width * 0.5;
    const collisionHeight = player.height * 0.7;
    const collisionX = player.x + (player.width - collisionWidth) / 2;
    const collisionY = player.y + (player.height - collisionHeight) / 2;
    const playerRect = { x: collisionX, y: collisionY, width: collisionWidth, height: collisionHeight };

    for (let i = chests.length - 1; i >= 0; i--) {
        const chest = chests[i];
        const chestRect = {
            x: chest.col * TILE_SIZE - (OBJECT_SIZE - TILE_SIZE) / 2,
            y: chest.row * TILE_SIZE - (OBJECT_SIZE - TILE_SIZE) / 2,
            width: OBJECT_SIZE,
            height: OBJECT_SIZE
        };

        if (
            playerRect.x < chestRect.x + chestRect.width &&
            playerRect.x + playerRect.width > chestRect.x &&
            playerRect.y < chestRect.y + chestRect.height &&
            playerRect.y + playerRect.height > chestRect.y
        ) {
            chests.splice(i, 1); // Remove the chest
            score++;
            scoreDisplay.textContent = score;

            const coinFlip = document.createElement('img');
            coinFlip.src = 'assets/images/bg/coin_flip.gif';
            coinFlip.style.position = 'absolute';
            coinFlip.style.width = `${OBJECT_SIZE}px`;
            coinFlip.style.height = `${OBJECT_SIZE}px`;

            const effect = { 
                element: coinFlip, 
                x: chestRect.x, 
                y: chestRect.y, 
                timer: 60 // 1 second at 60fps
            };
            effects.push(effect);
            gameContainer.appendChild(coinFlip);
        }
    }
}

function update() {
    if (!gameStarted) return;

    let nextX = player.x;
    let nextY = player.y;
    let moving = false;

    if (keys.w || keys.ArrowUp) {
        nextY -= player.speed;
        moving = true;
    }
    if (keys.s || keys.ArrowDown) {
        nextY += player.speed;
        moving = true;
    }
    if (keys.a || keys.ArrowLeft) {
        nextX -= player.speed;
        moving = true;
    }
    if (keys.d || keys.ArrowRight) {
        nextX += player.speed;
        moving = true;
    }

    // Determine player direction
    if (moving) {
        if ((keys.w || keys.ArrowUp) && (keys.a || keys.ArrowLeft)) {
            player.direction = 'north-west';
        } else if ((keys.w || keys.ArrowUp) && (keys.d || keys.ArrowRight)) {
            player.direction = 'north-east';
        } else if ((keys.s || keys.ArrowDown) && (keys.a || keys.ArrowLeft)) {
            player.direction = 'south-west';
        } else if ((keys.s || keys.ArrowDown) && (keys.d || keys.ArrowRight)) {
            player.direction = 'south-east';
        } else if (keys.w || keys.ArrowUp) {
            player.direction = 'north';
        } else if (keys.s || keys.ArrowDown) {
            player.direction = 'south';
        } else if (keys.a || keys.ArrowLeft) {
            player.direction = 'west';
        } else if (keys.d || keys.ArrowRight) {
            player.direction = 'east';
        }

        player.animationTimer += player.animationSpeed;
        if (player.animationTimer >= framesPerDirection) {
            player.animationTimer = 0;
        }
        player.frame = Math.floor(player.animationTimer);
    } else {
        player.frame = 0; // Standing still, show first frame
    }

    if (isWalkable(nextX, nextY)) {
        player.x = nextX;
        player.y = nextY;
    } else if (isWalkable(nextX, player.y)) {
        player.x = nextX;
    } else if (isWalkable(player.x, nextY)) {
        player.y = nextY;
    }

    checkChestCollision();

    // Update effects
    for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        effect.timer--;
        if (effect.timer <= 0) {
            gameContainer.removeChild(effect.element);
            effects.splice(i, 1);
        } else {
            effect.element.style.left = `${effect.x - camera.x}px`;
            effect.element.style.top = `${effect.y - camera.y}px`;
        }
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
    if (!gameStarted) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // save context
    ctx.save();

    // translate to camera position
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    drawMap();
    ctx.drawImage(assets.animations.player[player.direction][player.frame], Math.round(player.x), Math.round(player.y), player.width, player.height);

    /*
    // Draw bounding boxes for debugging
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    // Player collision box
    const collisionWidth = player.width * 0.5;
    const collisionHeight = player.height * 0.7;
    const collisionX = player.x + (player.width - collisionWidth) / 2;
    const collisionY = player.y + (player.height - collisionHeight) / 2;
    ctx.strokeRect(collisionX, collisionY, collisionWidth, collisionHeight);

    // Object collision boxes
    for (const obj of spawnedObjects) {
        const objX = obj.col * TILE_SIZE - (OBJECT_SIZE - TILE_SIZE) / 2;
        const objY = obj.row * TILE_SIZE - (OBJECT_SIZE - TILE_SIZE) / 2;
        ctx.strokeRect(objX, objY, OBJECT_SIZE, OBJECT_SIZE);
    }
    */

    // restore context
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

const allLoadedImages = [];
Object.values(assets.images).forEach(img => allLoadedImages.push(img));
for (const dir of directions) {
    assets.animations.player[dir].forEach(img => allLoadedImages.push(img));
}

Promise.all(allLoadedImages.map(img => new Promise(resolve => img.onload = resolve))).then(() => {
    generateMap();
    gameLoop();
    // Initial setup: hide game elements, show start screen
    gameContainer.style.display = 'none';
    gameUI.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    gameOverlay.style.display = 'flex';
});

const upButton = document.getElementById('up');
const downButton = document.getElementById('down');
const leftButton = document.getElementById('left');
const rightButton = document.getElementById('right');

if (upButton) {
    upButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.w = true; }, { passive: false });
    upButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.w = false; }, { passive: false });
    downButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.s = true; }, { passive: false });
    downButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.s = false; }, { passive: false });
    leftButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.a = true; }, { passive: false });
    leftButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.a = false; }, { passive: false });
    rightButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.d = true; }, { passive: false });
    rightButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.d = false; }, { passive: false });
}

function lockOrientation() {
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(err => console.log(err));
    }
}

window.addEventListener('load', () => {
    if (window.matchMedia("(pointer: coarse)").matches) {
        lockOrientation();
    }
});

const fullscreenButton = document.getElementById('fullscreen-btn');

if (fullscreenButton) {
    fullscreenButton.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    });
}

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenButton.textContent = 'Exit Fullscreen';
    } else {
        fullscreenButton.textContent = 'Fullscreen';
    }
});

// Event Listeners for game control buttons
startButton.addEventListener('click', startGame);
playAgainButton.addEventListener('click', resetGame);