// Game Configuration
const CONFIG = {
    canvas: {
        width: 800,
        height: 600
    },
    player: {
        width: 40,
        height: 40,
        speed: 5,
        fireRate: 250 // ms between shots
    },
    enemy: {
        width: 35,
        height: 35,
        speed: 1,
        spawnRate: 2000, // ms between spawns
        minSpeed: 0.5,
        maxSpeed: 3
    },
    bullet: {
        width: 4,
        height: 15,
        speed: 7
    },
    star: {
        count: 100
    }
};

// Game State
const gameState = {
    score: 0,
    level: 1,
    lives: 3,
    isRunning: false,
    isPaused: false
};

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.canvas.width;
canvas.height = CONFIG.canvas.height;

// Input State
const keys = {};
let lastFireTime = 0;

// Game Objects
const player = {
    x: CONFIG.canvas.width / 2 - CONFIG.player.width / 2,
    y: CONFIG.canvas.height - CONFIG.player.height - 20,
    width: CONFIG.player.width,
    height: CONFIG.player.height,
    speed: CONFIG.player.speed
};

const bullets = [];
const enemies = [];
const explosions = [];
const stars = [];
const particles = [];

// Initialize Stars Background
function initStars() {
    for (let i = 0; i < CONFIG.star.count; i++) {
        stars.push({
            x: Math.random() * CONFIG.canvas.width,
            y: Math.random() * CONFIG.canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

// Create Particle Effect
function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1,
            color: color,
            size: Math.random() * 3 + 1
        });
    }
}

// Update Functions
function updateStars() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > CONFIG.canvas.height) {
            star.y = 0;
            star.x = Math.random() * CONFIG.canvas.width;
        }
    });
}

function updatePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < CONFIG.canvas.width - player.width) {
        player.x += player.speed;
    }
    
    // Auto-fire when space is held
    if (keys[' ']) {
        const now = Date.now();
        if (now - lastFireTime > CONFIG.player.fireRate) {
            fireBullet();
            lastFireTime = now;
        }
    }
}

function fireBullet() {
    bullets.push({
        x: player.x + player.width / 2 - CONFIG.bullet.width / 2,
        y: player.y,
        width: CONFIG.bullet.width,
        height: CONFIG.bullet.height,
        speed: CONFIG.bullet.speed
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        
        // Remove bullets that are off screen
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }
}

function spawnEnemy() {
    const enemySpeed = CONFIG.enemy.minSpeed + (gameState.level * 0.2);
    enemies.push({
        x: Math.random() * (CONFIG.canvas.width - CONFIG.enemy.width),
        y: -CONFIG.enemy.height,
        width: CONFIG.enemy.width,
        height: CONFIG.enemy.height,
        speed: Math.min(enemySpeed, CONFIG.enemy.maxSpeed),
        type: Math.floor(Math.random() * 3) // Different enemy types
    });
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        
        // Remove enemies that are off screen
        if (enemies[i].y > CONFIG.canvas.height) {
            enemies.splice(i, 1);
            continue;
        }
        
        // Check collision with player
        if (checkCollision(enemies[i], player)) {
            createParticles(player.x + player.width / 2, player.y + player.height / 2, 30, '#f093fb');
            enemies.splice(i, 1);
            gameState.lives--;
            updateUI();
            
            if (gameState.lives <= 0) {
                gameOver();
            }
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (checkCollision(bullets[i], enemies[j])) {
                // Create explosion effect
                createParticles(
                    enemies[j].x + enemies[j].width / 2,
                    enemies[j].y + enemies[j].height / 2,
                    20,
                    '#4facfe'
                );
                
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                
                gameState.score += 10;
                updateUI();
                
                // Check for level up
                if (gameState.score > 0 && gameState.score % 100 === 0) {
                    levelUp();
                }
                
                break;
            }
        }
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Draw Functions
function drawStars() {
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;
}

function drawPlayer() {
    // Draw spaceship body
    const gradient = ctx.createLinearGradient(
        player.x, player.y, player.x, player.y + player.height
    );
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Draw cockpit
    ctx.fillStyle = '#4facfe';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw engine glow
    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.fillRect(player.x + 5, player.y + player.height, 10, 8);
    ctx.fillRect(player.x + player.width - 15, player.y + player.height, 10, 8);
}

function drawBullets() {
    ctx.fillStyle = '#4facfe';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#4facfe';
    
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    ctx.shadowBlur = 0;
}

function drawEnemies() {
    enemies.forEach(enemy => {
        // Different colors for different enemy types
        const colors = [
            ['#f093fb', '#f5576c'],
            ['#feca57', '#ee5a6f'],
            ['#00d2ff', '#3a7bd5']
        ];
        
        const colorPair = colors[enemy.type];
        const gradient = ctx.createLinearGradient(
            enemy.x, enemy.y, enemy.x, enemy.y + enemy.height
        );
        gradient.addColorStop(0, colorPair[0]);
        gradient.addColorStop(1, colorPair[1]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y);
        ctx.closePath();
        ctx.fill();
        
        // Draw enemy detail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(enemy.x + enemy.width / 2 - 3, enemy.y + 10, 6, 6);
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

// UI Functions
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, gameState.lives));
}

function levelUp() {
    gameState.level++;
    updateUI();
    
    // Show level up screen briefly
    const levelUpScreen = document.getElementById('levelUpScreen');
    levelUpScreen.classList.remove('hidden');
    
    setTimeout(() => {
        levelUpScreen.classList.add('hidden');
    }, 2000);
}

function gameOver() {
    gameState.isRunning = false;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalLevel').textContent = gameState.level;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// Game Loop
let lastEnemySpawn = 0;

function gameLoop(timestamp) {
    if (!gameState.isRunning) return;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    
    // Update
    updateStars();
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateParticles();
    checkCollisions();
    
    // Spawn enemies
    const spawnRate = Math.max(800, CONFIG.enemy.spawnRate - (gameState.level * 100));
    if (timestamp - lastEnemySpawn > spawnRate) {
        spawnEnemy();
        lastEnemySpawn = timestamp;
    }
    
    // Draw
    drawStars();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawParticles();
    
    requestAnimationFrame(gameLoop);
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    gameState.isRunning = true;
    gameState.score = 0;
    gameState.level = 1;
    gameState.lives = 3;
    updateUI();
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    // Reset game state
    bullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    player.x = CONFIG.canvas.width / 2 - CONFIG.player.width / 2;
    
    startGame();
}

// Initialize
initStars();
updateUI();
