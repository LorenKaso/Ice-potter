const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const gravity = 0.5;
const friction = 0.8;
const baseJump = -10;
const platformSpacing = 50; 
const platformTimeout = 4000; //pltform gone after 4 sec
const platformDecayDelay = 5000;

// Score
let score = 0;
let highestPlatformReached = 0;

// Player
let player = {
    x: canvas.width / 2,
    y: canvas.height - 150,
    width: 20,
    height: 20,
    speed: 5,
    velX: 0,
    velY: 0,
    jumping: false,
    onPlatformIndex: null,    
    standingSince: null  
};

// Platforms
let platforms = [];
let currentIndex = 0;

// First platform: index 0, full width at bottom
platforms.push({
    x: 0,
    y: canvas.height - 50,
    width: canvas.width,
    height: 10,
    index: currentIndex++,
    visible: true, //platform gone or not
    timeStartedStanding: null,
    timeLeftStanding: null,    
    playerWasOn: false,
    falling: false,
    shouldFall: false,
    enemy: null
});

let lastY = canvas.height - 50;

function createPlatform(y) {
    let width = currentIndex % 10 === 0 ? canvas.width : 100;
    let x = width === canvas.width ? 0 : Math.random() * (canvas.width - width);

    let enemy = null;
    if (Math.random() < 0.05) { // 5% סיכוי
        const enemyType = Math.random() < 0.5 ? 'Type1' : 'Type2';
        enemy = {
            type: enemyType,
            width: 20,
            height: 20,
            x: x + (enemyType === 'Type1' ? (width / 2 - 10) : 0),
            y: y - 20,
            direction: (enemyType === 'Type2' ? 1 : 0)// only for Tyoe2
        };
    }

    return {
        x: x,
        y: y,
        width: width,
        height: 10,
        index: currentIndex++,
        visible: true,
        timeStartedStanding: null,
        timeLeftStanding: null,
        playerWasOn: false,
        falling: false,
        shouldFall: false,
        enemy: enemy
    };
}

// First platform
platforms.push(createPlatform(lastY));

// Add a few to start
for (let i = 0; i < 9; i++) {
    lastY -= platformSpacing + Math.floor(Math.random() * 50);
    platforms.push(createPlatform(lastY));
}


// Key Listener
let keys = [];
window.addEventListener('keydown', function (e) {
    keys[e.keyCode] = true;
    if (e.keyCode == 32 && !player.jumping) {
        player.jumping = true;
        player.velY = baseJump - Math.abs(player.velX);
    }
});

window.addEventListener('keyup', function (e) {
    keys[e.keyCode] = false;
});


function maybeAddPlatforms() {
    const minY = Math.min(...platforms.map(p => p.y));
    while (lastY > minY - canvas.height) {
        let newY = lastY - (platformSpacing + Math.floor(Math.random() * 50));
        platforms.push(createPlatform(newY));
        lastY = newY;
    }
}

function updateGame() {
    
    if (keys[39]) {
        if (player.velX < player.speed) {
            player.velX++;
        }
    }
    if (keys[37]) {
        if (player.velX > -player.speed) {
            player.velX--;
        }
    }

    player.velX *= friction;
    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    // Screen scroll
    if (player.y < canvas.height / 4) {
        const scroll = Math.abs(player.velY);
        player.y += scroll;
        platforms.forEach(platform => {
            platform.y += scroll;
            if (platform.enemy) {
                platform.enemy.y += scroll;
            }
        });
        maybeAddPlatforms(); 
    }
    if (player.x >= canvas.width - player.width) {
        player.x = canvas.width - player.width;
    } else if (player.x <= 0) {
        player.x = 0;
    }

    if (player.y >= canvas.height - player.height) {
        player.y = canvas.height - player.height;
        player.jumping = false;
        player.velY = 0;
    }

    let standingOn = null;

    platforms.forEach(platform => {
        if (!platform.visible) return;

        const isOnPlatform =
        player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height > platform.y &&
        player.y + player.height < platform.y + platform.height &&
        player.velY >= 0;

        if (isOnPlatform) {
        player.jumping = false;
        player.velY = 0;
        player.y = platform.y - player.height;
        standingOn = platform.index;
        platform.playerWasOn = true;

        if (platform.index > highestPlatformReached) {
            const jumpDistance = platform.index - highestPlatformReached;
            if (jumpDistance >= 1) {
            score += jumpDistance * 10;
            if (jumpDistance > 2) {
                score += 50;
            }
            }
            highestPlatformReached = platform.index;
        }

        if (platform.timeStartedStanding === null) {
            platform.timeStartedStanding = Date.now();
        } else if (Date.now() - platform.timeStartedStanding > platformTimeout) {
            platform.shouldFall = true;
        }

        platform.timeLeftStanding = null;
        } else {
        if (platform.timeStartedStanding !== null && platform.timeLeftStanding === null) {
            platform.timeLeftStanding = Date.now();
        }
        platform.timeStartedStanding = null;

        if (platform.playerWasOn && platform.timeLeftStanding !== null && Date.now() - platform.timeLeftStanding > platformDecayDelay) {
            platform.shouldFall = true;
        }
        }

        if (platform.shouldFall && !platform.falling) {
        platform.falling = true;
        }

        if (platform.falling) {
        platform.y += 5;
        if (platform.y > canvas.height + 100) {
            platform.visible = false;
            platform.falling = false;
            platform.shouldFall = false;
        }
        }
    });

    // 🟡 Update moving enemies (Type2)
    platforms.forEach(platform => {
        const enemy = platform.enemy;
        if (enemy && enemy.type === 'Type2') {
            // movement enemy 
            enemy.x += 1.5 * enemy.direction;

            // direction
            if (enemy.x <= platform.x || enemy.x + enemy.width >= platform.x + platform.width) {
                enemy.direction *= -1;
            }
        }
    });



    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.fillStyle = 'red';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw platforms with index
    platforms.sort((a, b) => a.y - b.y);
    platforms.forEach(platform => {
    ctx.fillStyle = 'black';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    if (platform.index % 10 === 0) {
        ctx.fillStyle = 'black';
        ctx.font = '16px "Mystery Quest", cursive';
        const text = platform.index.toString();
        const textWidth = ctx.measureText(text).width;
        const centerX = platform.x + (platform.width / 2) - (textWidth / 2);
        const belowY = platform.y + platform.height + 14; 
        ctx.fillText(text, centerX, belowY);
    }
    });

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '20px "Mystery Quest", cursive';
    ctx.fillText('Score: ' + score.toString().padStart(Math.max(4, score.toString().length), '0'), 10, 30);
    
    //  Draw enemies
    platforms.forEach(platform => {
    const enemy = platform.enemy;
        if (enemy && platform.visible) {
            ctx.fillStyle = enemy.type === 'Type1' ? 'purple' : 'orange';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });

    requestAnimationFrame(updateGame);
    }

    updateGame();
