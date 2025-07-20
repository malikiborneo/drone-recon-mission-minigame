const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameStatusEl = document.getElementById('gameStatus');
const fuelBar = document.getElementById('fuel-bar');
const timerEl = document.getElementById('timer');
const livesEl = document.getElementById('lives');
const dataCounterEl = document.getElementById('dataCounter');
const levelTitleEl = document.getElementById('levelTitle');
const levelModal = document.getElementById('levelModal');
const modalTitle = document.getElementById('modalTitle');
const modalScore = document.getElementById('modalScore');
const modalButton = document.getElementById('modalButton');
const briefingModal = document.getElementById('briefingModal');
const startButton = document.getElementById('startButton');
const nameInputContainer = document.getElementById('nameInputContainer');
const nameInput = document.getElementById('nameInput');
const leaderboardList = document.getElementById('leaderboardList');

// NEW: D-Pad buttons
const dPadUp = document.getElementById('d-pad-up');
const dPadDown = document.getElementById('d-pad-down');
const dPadLeft = document.getElementById('d-pad-left');
const dPadRight = document.getElementById('d-pad-right');


let drone, enemies, extractionZone, keys, gameOver, gameWon, gameOverMessage, score, totalScore, currentLevel, lives, dataPackets, collectedData;
let missionTimer, timerInterval, gameStarted = false;

// --- LEVEL DATA ---
const levels = [
    { time: 60, fuel: 100, data: [{x:400, y:300}], enemies: [{ type: 'radar', x: 300, y: 300, radius: 50 }] },
    { time: 70, fuel: 100, data: [{x:600, y:100}], enemies: [{ type: 'radar', x: 200, y: 150, radius: 40 },{ type: 'searchlight', x: 500, y: 400, radius: 100, startAngle: 0, endAngle: Math.PI/4, speed: 0.01 }] },
    { time: 75, fuel: 140, data: [{x:700, y:150}, {x:100, y:450}], enemies: [{ type: 'radar', x: 400, y: 100, radius: 50 }], terrain: [{x:0, y:280, width: 550, height: 40}] },
    { time: 80, fuel: 120, data: [{x:100, y:100}, {x:700, y:500}], enemies: [{ type: 'sam', x: 400, y: 300, radius: 150, lockTime: 2000 }], terrain: [{x:200, y:0, width:40, height:250}, {x:600, y:350, width:40, height:250}] },
    { time: 80, fuel: 125, data: [{x:100, y:500}, {x:700, y:100}], enemies: [{ type: 'radar', x: 180, y: 150, radius: 45, speed: 1, direction: 1, patrolAxis: 'y', patrolStart: 100, patrolEnd: 200 }, { type: 'jet', x: 600, y: 50, width: 30, height: 20, speed: 2, direction: 1, visionLength: 70 }], bonuses: [{type: 'life', x: 400, y: 550}] },
    { time: 90, fuel: 120, data: [{x:400, y:100}, {x:400, y:500}], enemies: [{ type: 'searchlight', x: 250, y: 150, radius: 100, startAngle: 0, endAngle: Math.PI/4, speed: 0.02 }, { type: 'searchlight', x: 550, y: 450, radius: 100, startAngle: Math.PI, endAngle: Math.PI*1.25, speed: -0.02 }], terrain: [{x:0, y:280, width: 350, height: 40}, {x:450, y:280, width: 350, height: 40}] },
    { time: 85, fuel: 120, data: [{x:100, y:100}, {x:400, y:250}, {x:700, y:500}], enemies: [{ type: 'sam', x: 250, y: 150, radius: 120, lockTime: 1500 }, { type: 'sam', x: 550, y: 450, radius: 120, lockTime: 1500 }, { type: 'radar', x: 400, y: 300, radius: 40 }] },
    { time: 90, fuel: 120, data: [{x:100, y:500}, {x:750, y:100}], enemies: [{ type: 'jet', x: 400, y: 50, width: 30, height: 20, speed: 3, direction: 1, visionLength: 90 }], terrain: [{x:150, y:0, width:50, height:400}, {x:600, y:200, width:50, height:400}], bonuses: [{type: 'life', x: 750, y: 50}] },
    { time: 90, fuel: 115, data: [{x:100, y:550}, {x:400, y:50}, {x:750, y:100}], enemies: [{ type: 'radar', x: 150, y: 100, radius: 40, speed: 2, direction: 1, patrolAxis: 'y', patrolStart: 50, patrolEnd: 150 }, { type: 'searchlight', x: 400, y: 300, radius: 150, startAngle: 0, endAngle: Math.PI/4, speed: 0.025 }, { type: 'sam', x: 650, y: 500, radius: 100, lockTime: 1000 }, { type: 'jet', patrolAxis: 'x', x: 100, y: 400, width: 30, height: 20, speed: 2.5, direction: 1, visionLength: 70, patrolStart: 100, patrolEnd: 700 }] },
    { time: 90, fuel: 175, data: [{x:100, y:100}, {x:100, y:500}, {x:400, y:300}, {x:700, y:100}, {x:700, y:500}], enemies: [{ type: 'jet', x: 600, y: 50, width: 30, height: 20, speed: 3.5, direction: 1, visionLength: 100 }, { type: 'sam', x: 200, y: 450, radius: 130, lockTime: 800 }, { type: 'searchlight', x: 400, y: 0, radius: 200, startAngle: Math.PI/2, endAngle: Math.PI, speed: 0.03 }], terrain: [{x:0, y:200, width: 250, height: 40}, {x:250, y:400, width: 400, height: 40}] }
];

function startNewCampaign() {
    totalScore = 0;
    lives = 3;
    gameStarted = false;
    initializeGame(0);
    briefingModal.style.display = 'block';
    drawFullScene();
    loadLeaderboard();
}

function initializeGame(levelIndex) {
    currentLevel = levelIndex;
    const levelData = levels[currentLevel];
    
    drone = { x: 40, y: 50, width: 25, height: 15, color: '#00ff41', speed: 3, fuel: levelData.fuel, maxFuel: levelData.fuel, fuelDepletionRate: 0.15 };
    
    enemies = JSON.parse(JSON.stringify(levelData.enemies || [])); 
    enemies.forEach(e => { if(e.type === 'sam') e.lockProgress = 0; });
    levelData.bonuses = JSON.parse(JSON.stringify(levelData.bonuses || []));
    dataPackets = JSON.parse(JSON.stringify(levelData.data || []));
    collectedData = 0;
    extractionZone = { x: canvas.width - 50, y: canvas.height / 2 - 40, width: 15, height: 80, color: '#ff4141' };
    
    keys = {};
    gameOver = false;
    gameWon = false;
    gameOverMessage = '';
    score = 0;
    missionTimer = levelData.time;

    levelTitleEl.textContent = `Level ${currentLevel + 1}`;
    gameStatusEl.textContent = gameStarted ? 'Mission In-Progress' : 'Awaiting Deployment';
    gameStatusEl.style.color = '#ffff00';
    levelModal.style.display = 'none';
    nameInputContainer.style.display = 'none';
    fuelBar.style.width = '100%';
    livesEl.innerHTML = '♥'.repeat(lives);
    timerEl.textContent = missionTimer;
    updateDataCounter();
    
    if (timerInterval) clearInterval(timerInterval);
}

function beginGameplay() {
    gameStarted = true;
    gameStatusEl.textContent = 'Mission In-Progress';
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    gameLoop();
}

// --- Event Listeners ---
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

startButton.addEventListener('click', () => {
    briefingModal.style.display = 'none';
    beginGameplay();
});

modalButton.addEventListener('click', () => {
    if (modalButton.textContent === 'Submit Score') {
        saveScore();
        loadLeaderboard();
        nameInputContainer.style.display = 'none';
        modalButton.textContent = 'Play Again?';
        return;
    }
    
    levelModal.style.display = 'none';
    if (modalButton.textContent === 'Play Again?') {
        startNewCampaign();
    } else if (gameWon) {
        initializeGame(currentLevel + 1);
        beginGameplay();
    } else { // Retry
        initializeGame(currentLevel);
        beginGameplay();
    }
});

// --- NEW: Touch Controls Event Listeners ---
function handleTouch(event, isStart) {
    event.preventDefault(); // Prevent screen scrolling
    const keyMap = {
        'd-pad-up': 'ArrowUp',
        'd-pad-down': 'ArrowDown',
        'd-pad-left': 'ArrowLeft',
        'd-pad-right': 'ArrowRight'
    };
    const key = keyMap[event.currentTarget.id];
    if (key) {
        keys[key] = isStart;
    }
}

dPadUp.addEventListener('touchstart', (e) => handleTouch(e, true));
dPadDown.addEventListener('touchstart', (e) => handleTouch(e, true));
dPadLeft.addEventListener('touchstart', (e) => handleTouch(e, true));
dPadRight.addEventListener('touchstart', (e) => handleTouch(e, true));

dPadUp.addEventListener('touchend', (e) => handleTouch(e, false));
dPadDown.addEventListener('touchend', (e) => handleTouch(e, false));
dPadLeft.addEventListener('touchend', (e) => handleTouch(e, false));
dPadRight.addEventListener('touchend', (e) => handleTouch(e, false));

// Prevent context menu on long press
canvas.addEventListener('contextmenu', e => e.preventDefault());


// --- Update Functions ---
function updateDrone() {
    let moved = false;
    if (keys['ArrowUp'] && drone.y > 0) { drone.y -= drone.speed; moved = true; }
    if (keys['ArrowDown'] && drone.y < canvas.height - drone.height) { drone.y += drone.speed; moved = true; }
    if (keys['ArrowLeft'] && drone.x > 0) { drone.x -= drone.speed; moved = true; }
    if (keys['ArrowRight'] && drone.x < canvas.width - drone.width) { drone.x += drone.speed; moved = true; }
    
    if (moved && !gameOver && !gameWon) {
        drone.fuel -= drone.fuelDepletionRate;
        fuelBar.style.width = (drone.fuel / drone.maxFuel) * 100 + '%';
        if (drone.fuel <= 0) {
            gameOver = true;
            gameOverMessage = 'FAILED - OUT OF FUEL';
        }
    }
}

function updateEnemies() {
    enemies.forEach(enemy => {
        if (enemy.type === 'searchlight') { enemy.startAngle += enemy.speed; enemy.endAngle += enemy.speed; }
        else if (enemy.type === 'jet' && enemy.patrolAxis !== 'x') { enemy.y += enemy.speed * enemy.direction; if (enemy.y <= 0 || enemy.y + enemy.height >= canvas.height) enemy.direction *= -1; }
        else if (enemy.type === 'jet' && enemy.patrolAxis === 'x') { enemy.x += enemy.speed * enemy.direction; if (enemy.x <= enemy.patrolStart || enemy.x + enemy.width >= enemy.patrolEnd) enemy.direction *= -1; }
        else if (enemy.patrolAxis === 'y') { enemy.y += enemy.speed * enemy.direction; if (enemy.y <= enemy.patrolStart || enemy.y >= enemy.patrolEnd) enemy.direction *= -1; }
        else if (enemy.type === 'sam') { const dist = Math.hypot(drone.x - enemy.x, drone.y - enemy.y); if (dist < enemy.radius) { enemy.lockProgress += 1000 / 60; if (enemy.lockProgress >= enemy.lockTime) { gameOver = true; gameOverMessage = 'FAILED - MISSILE IMPACT'; } } else { enemy.lockProgress = Math.max(0, enemy.lockProgress - 20); } }
    });
}

function updateTimer() {
    timerEl.textContent = missionTimer;
    if (missionTimer <= 0 && !gameOver && !gameWon) {
        gameOver = true;
        gameOverMessage = 'FAILED - TIME UP';
    }
    if (gameStarted && !gameOver && !gameWon) {
        missionTimer--;
    }
}

function updateDataCounter() {
    dataCounterEl.textContent = `${collectedData}/${dataPackets.length + collectedData}`;
    if (dataPackets.length === 0) {
        extractionZone.color = '#41a0ff';
    }
}

// --- Drawing Functions ---
function drawDrone() {
    ctx.fillStyle = drone.color;
    ctx.beginPath();
    ctx.moveTo(drone.x, drone.y);
    ctx.lineTo(drone.x + drone.width, drone.y + drone.height / 2);
    ctx.lineTo(drone.x, drone.y + drone.height);
    ctx.closePath();
    ctx.fill();
}

function drawExtractionZone() {
    ctx.fillStyle = extractionZone.color;
    ctx.fillRect(extractionZone.x, extractionZone.y, extractionZone.width, extractionZone.height);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(extractionZone.x, extractionZone.y, extractionZone.width, extractionZone.height);
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.type === 'radar') { ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255, 65, 65, 0.7)'; ctx.lineWidth = 2; ctx.stroke(); }
        else if (enemy.type === 'searchlight') { ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.arc(enemy.x, enemy.y, enemy.radius, enemy.startAngle, enemy.endAngle); ctx.closePath(); ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; ctx.fill(); }
        else if (enemy.type === 'jet') {
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            ctx.beginPath();
            if (enemy.patrolAxis === 'x') {
                ctx.moveTo(enemy.x, enemy.y + enemy.height);
                ctx.lineTo(enemy.x - 20, enemy.y + enemy.height + enemy.visionLength);
                ctx.lineTo(enemy.x + enemy.width + 20, enemy.y + enemy.height + enemy.visionLength);
            } else {
                ctx.moveTo(enemy.x, enemy.y);
                ctx.lineTo(enemy.x - enemy.visionLength, enemy.y - 20);
                ctx.lineTo(enemy.x - enemy.visionLength, enemy.y + enemy.height + 20);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
            ctx.fill();
        }
        else if (enemy.type === 'sam') { ctx.fillStyle = '#ff8c00'; ctx.font = 'bold 20px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('S', enemy.x, enemy.y); if (enemy.lockProgress > 0) { ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(drone.x + drone.width/2, drone.y + drone.height/2, 20, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * (enemy.lockProgress / enemy.lockTime))); ctx.stroke(); } }
    });
}

function drawTerrain() {
    const terrainData = levels[currentLevel].terrain;
    if (!terrainData) return;
    ctx.fillStyle = 'rgba(139, 69, 19, 0.5)';
    terrainData.forEach(t => {
        ctx.fillRect(t.x, t.y, t.width, t.height);
    });
}

function drawDataPackets() {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    dataPackets.forEach(packet => {
        ctx.fillText('🗎', packet.x, packet.y);
    });
}

function drawBonuses() {
    const bonusData = levels[currentLevel].bonuses;
    if (!bonusData) return;
    bonusData.forEach(bonus => {
        if (bonus.type === 'life') {
            ctx.fillStyle = '#00ff41';
            ctx.font = 'bold 24px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('♥', bonus.x, bonus.y);
        }
    });
}

function drawFullScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTerrain();
    drawEnemies();
    drawBonuses();
    drawDataPackets();
    drawExtractionZone();
    drawDrone();
}

// --- Collision & Win Condition ---
function checkCollisions() {
    if (gameOver) return;
    const terrainData = levels[currentLevel].terrain;
    if (terrainData) { for (const t of terrainData) { if (rectRectCollide(drone, t)) { gameOver = true; gameOverMessage = 'FAILED - COLLISION WITH TERRAIN'; return; } } }
    enemies.forEach(enemy => {
        if (gameOver) return;
        let detected = false;
        if (enemy.type === 'radar') { if (rectCircleCollide(drone, enemy)) { detected = true; gameOverMessage = 'FAILED - RADAR DETECTED'; } }
        else if (enemy.type === 'searchlight') { if (rectArcCollide(drone, enemy)) { detected = true; gameOverMessage = 'FAILED - SEARCHLIGHT DETECTED'; } }
        else if (enemy.type === 'jet') {
            if (rectRectCollide(drone, enemy)) { detected = true; gameOverMessage = 'FAILED - COLLISION WITH JET'; }
            let visionCone;
            if (enemy.patrolAxis === 'x') {
                visionCone = [{x: enemy.x, y: enemy.y + enemy.height}, {x: enemy.x - 20, y: enemy.y + enemy.height + enemy.visionLength}, {x: enemy.x + enemy.width + 20, y: enemy.y + enemy.height + enemy.visionLength}];
            } else {
                visionCone = [{x: enemy.x, y: enemy.y}, {x: enemy.x - enemy.visionLength, y: enemy.y - 20}, {x: enemy.x - enemy.visionLength, y: enemy.y + enemy.height + 20}];
            }
            if (rectPolygonCollide(drone, visionCone)) { detected = true; gameOverMessage = 'FAILED - SPOTTED BY JET'; }
        }
        if (detected) gameOver = true;
    });
}

function checkDataPacketCollision() {
    for (let i = dataPackets.length - 1; i >= 0; i--) {
        const packet = dataPackets[i];
        const packetRect = { x: packet.x - 12, y: packet.y - 12, width: 24, height: 24 };
        if (rectRectCollide(drone, packetRect)) {
            dataPackets.splice(i, 1);
            collectedData++;
            updateDataCounter();
        }
    }
}

function checkBonusCollisions() {
    const bonusData = levels[currentLevel].bonuses;
    if (!bonusData) return;
    for (let i = bonusData.length - 1; i >= 0; i--) {
        const bonus = bonusData[i];
        const bonusRect = { x: bonus.x - 12, y: bonus.y - 12, width: 24, height: 24 };
        if (rectRectCollide(drone, bonusRect)) {
            if (bonus.type === 'life') {
                lives++;
                livesEl.innerHTML = '♥'.repeat(lives);
                bonusData.splice(i, 1);
            }
        }
    }
}

function checkWinCondition() {
    const allDataCollected = dataPackets.length === 0;
    if (allDataCollected && rectRectCollide(drone, extractionZone)) {
        gameWon = true;
        score = Math.round(drone.fuel * 10) + (missionTimer * 5);
        totalScore += score;
    }
}

function showModal() {
    levelModal.style.display = 'block';
    if (gameWon) {
        if (currentLevel === levels.length - 1) {
            modalTitle.textContent = 'CAMPAIGN COMPLETE!';
            modalScore.textContent = `Final Score: ${totalScore}`;
            nameInputContainer.style.display = 'block';
            modalButton.textContent = 'Submit Score';
        } else {
            modalTitle.textContent = `Level ${currentLevel + 1} Complete!`;
            modalScore.textContent = `Score: ${score}`;
            modalButton.textContent = 'Next Level';
        }
    } else {
        if (!gameOverMessage) { gameOverMessage = 'MISSION FAILED'; }
        lives--;
        livesEl.innerHTML = '♥'.repeat(Math.max(0, lives));
        if (lives >= 0) {
            modalTitle.textContent = gameOverMessage;
            modalScore.textContent = `Level ${currentLevel + 1} Failed. ${lives} lives remaining.`;
            modalButton.textContent = 'Retry Level';
        } else {
            modalTitle.textContent = 'GAME OVER';
            modalScore.textContent = `Final Score: ${totalScore}`;
            nameInputContainer.style.display = 'block';
            modalButton.textContent = 'Submit Score';
        }
    }
}

// --- Leaderboard Functions ---
function saveScore() {
    const name = nameInput.value.trim().toUpperCase() || 'PILOT';
    const scores = JSON.parse(localStorage.getItem('droneReconScores')) || [];
    
    const newScore = {
        name: name,
        score: totalScore,
        level: currentLevel + 1
    };
    
    scores.push(newScore);
    scores.sort((a, b) => b.score - a.score);
    scores.splice(5);
    
    localStorage.setItem('droneReconScores', JSON.stringify(scores));
}

function loadLeaderboard() {
    const scores = JSON.parse(localStorage.getItem('droneReconScores')) || [];
    leaderboardList.innerHTML = '';
    if (scores.length === 0) {
        leaderboardList.innerHTML = '<li>No scores yet.</li>';
    } else {
        scores.forEach(s => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${s.name} - Lvl ${s.level}</span><span>${s.score}</span>`;
            leaderboardList.appendChild(li);
        });
    }
}

// --- Main Game Loop ---
function gameLoop() {
    if (!gameStarted) return;
    if (gameOver || gameWon) {
        clearInterval(timerInterval);
        showModal();
        return;
    }
    updateDrone();
    updateEnemies();
    drawFullScene();
    checkCollisions();
    checkBonusCollisions();
    checkDataPacketCollision();
    checkWinCondition();
    requestAnimationFrame(gameLoop);
}

// --- Helper functions ---
function rectCircleCollide(rect, circle) { const distX = Math.abs(circle.x - rect.x - rect.width / 2); const distY = Math.abs(circle.y - rect.y - rect.height / 2); if (distX > (rect.width / 2 + circle.radius) || distY > (rect.height / 2 + circle.radius)) return false; if (distX <= (rect.width / 2) || distY <= (rect.height / 2)) return true; const dx = distX - rect.width / 2; const dy = distY - rect.height / 2; return (dx * dx + dy * dy <= (circle.radius * circle.radius)); }
function rectArcCollide(rect, arc) { const rectCenterX = rect.x + rect.width / 2; const rectCenterY = rect.y + rect.height / 2; const dx = rectCenterX - arc.x; const dy = rectCenterY - arc.y; const distance = Math.sqrt(dx * dx + dy * dy); if (distance > arc.radius + rect.width) return false; let angle = Math.atan2(dy, dx); if (angle < 0) angle += 2 * Math.PI; let start = arc.startAngle % (2 * Math.PI); if (start < 0) start += 2 * Math.PI; let end = arc.endAngle % (2 * Math.PI); if (end < 0) end += 2 * Math.PI; if (start < end) { return distance <= arc.radius && angle >= start && angle <= end; } else { return distance <= arc.radius && (angle >= start || angle <= end); } }
function rectRectCollide(rect1, rect2) { return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y); }
function rectPolygonCollide(rect, polygon) { const corners = [{x: rect.x, y: rect.y}, {x: rect.x + rect.width, y: rect.y}, {x: rect.x, y: rect.y + rect.height}, {x: rect.x + rect.width, y: rect.y + rect.height}]; for(const corner of corners) { if(isPointInPolygon(corner, polygon)) return true; } return false; }
function isPointInPolygon(point, polygon) { let isInside = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) { const xi = polygon[i].x, yi = polygon[i].y; const xj = polygon[j].x, yj = polygon[j].y; const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi); if (intersect) isInside = !isInside; } return isInside; }

// --- Start the Game ---
startNewCampaign();
