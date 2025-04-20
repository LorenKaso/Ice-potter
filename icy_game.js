const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load Harry Potter image
const harryImg = new Image();
harryImg.src = 'images/player-harry.png';

// Load background image
const backgroundImg = new Image();
backgroundImg.src = 'images/background-hogwarts.jpeg';

// Load broom image
const broomImg = new Image();
broomImg.src = 'images/broom.png';

//// Load enemy image
const ballImg = new Image();
ballImg.src = 'images/enemy1.png';
const dementorImg = new Image();
dementorImg.src = 'images/enemy2.png';

//// Load star image
const starImg = new Image();
starImg.src = 'images/snitch.png'; 

//// Load spring image
const teleportImg = new Image();
teleportImg.src = 'images/spring1.png';

//sound/background
const backgroundMusic = new Audio('sounds/Harry Potter Music.mp3');
backgroundMusic.loop = true; 
backgroundMusic.volume = 0.5;

//sound/mute
const muteBtn = document.getElementById("muteBtn");
muteBtn.addEventListener("click", () => {
    if (backgroundMusic.muted) {
        backgroundMusic.muted = false;
        muteBtn.textContent = "🔊 השתק";
    } else {
        backgroundMusic.muted = true;
        muteBtn.textContent = "🔇 הפעל";
    }
});

//sound/teleport
const teleportSound = new Audio('sounds/teleport.mp3');

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
let highScore = JSON.parse(localStorage.getItem('highScore'))
let GameOver = false;
let gameOverScale = 0; // animation size

//star
let isInvincible = false;
let invincibleStartTime = null;

// Player
let player = {
    x: canvas.width / 2,
    y: canvas.height - 150,
    width: 45,
    height: 40,
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


function createPlatform(y) {
    let width = currentIndex % 100 === 0 ? canvas.width : 100;
    let x = width === canvas.width ? 0 : Math.random() * (canvas.width - width);
    //platform move up and down 
    let isMoving = Math.random() < 0.06; // 6% מהפלטפורמות
    let moveDirection = 1; // 1=למעלה, -1=למטה
    let moveSpeed = 0.5 + Math.random();
    //add star 
    let hasStar = Math.random() < 0.06; // 6% מהפלטפורמות יקבלו כוכב
    //add spring
    let isTeleportPad = Math.random() < 0.03; // 3% מהפלטפורמות

    let enemy = null;
    if (Math.random() < 0.05) { // 5%   
        const enemyType = Math.random() < 0.5 ? 'enemy1' : 'enemy2';
        enemy = {
            type: enemyType,
            width: enemyType === 'enemy2' ? 40 : 40,
            height: enemyType === 'enemy2' ? 60 : 50,
            x: x + 20,
            y: y - (enemyType === 'enemy2' ? 60 : 30),
            direction: (enemyType === 'enemy2' ? 1 : 0)
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
        enemy: enemy,
        moving: isMoving,
        direction: moveDirection,
        speed: moveSpeed,
        originalY: y,
        star: hasStar,
        teleport: isTeleportPad
    };
}

//start platform(index 0)
const bottomPlatform = {
    x: 0,
    y: canvas.height - 40,
    width: canvas.width,
    height: 10,
    index: currentIndex++,
    visible: true,
    timeStartedStanding: null,
    timeLeftStanding: null,
    playerWasOn: false,
    falling: false,
    shouldFall: false,
    enemy: null
};

platforms.push(bottomPlatform);

let lastY = bottomPlatform.y - 100;
platforms.push(createPlatform(lastY)); // index = 1


// Add a few to start
for (let i = 0; i < 8; i++) {
    lastY -= platformSpacing + Math.floor(Math.random() * 50);
    platforms.push(createPlatform(lastY));
}

//background canvas
function drawGameBackground() {
    ctx.save();     
    ctx.globalAlpha = 0.4; 
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    ctx.restore(); 
    
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#f5deb3'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
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

function triggerGameOver() {
    GameOver = true;
    /*clear screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);*/
    drawGameBackground();

    
    //show only game over
    ctx.fillStyle = 'black';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);

    setTimeout(() =>{
        // save scores
        let storedScores = JSON.parse(localStorage.getItem('highScores') || '[]');
        storedScores.push(score);
        storedScores.sort((a, b) => b - a);
        storedScores = storedScores.slice(0, 10);
        localStorage.setItem('highScores', JSON.stringify(storedScores));

        //  table Top Scores
        const scoreBoard = document.createElement('div');
        scoreBoard.className = 'score-board';
        scoreBoard.innerHTML = '<h2>Top Scores</h2>' +
        storedScores.map((s, i) => `<div>${i + 1}. ${s}</div>`).join('');
        document.body.appendChild(scoreBoard);

        // button Play Again
        const btn = document.createElement('button');
        btn.id = 'play-again-btn';
        btn.textContent = 'Play Again';
        btn.onclick = () => location.reload();
        document.body.appendChild(btn);
    },2000);
}


function updateGame() {
    
    if (GameOver) return;

    if (backgroundMusic.paused) {
        backgroundMusic.play().catch(e => console.log("User interaction required to start music"));
    }
    
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
    if (player.y+player.height >= canvas.height){
        triggerGameOver();
    }
    

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

//movment platform
platforms.forEach(platform => {
    if (platform.moving && platform.visible) {
        platform.y += platform.direction * platform.speed;

        if (Math.abs(platform.y - platform.originalY) > 30) {
            platform.direction *= -1;
        }

        if (platform.enemy) {
            platform.enemy.y += platform.direction * platform.speed;
        }
    }
});

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

    if (isInvincible && Date.now() - invincibleStartTime > 7000) {
        isInvincible = false;
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

        //  אם יש כוכב על הפלטפורמה והשחקן נוגע בו
        if (platform.star) {
            const touchingStar =
                player.x < platform.x + platform.width &&
                player.x + player.width > platform.x &&
                player.y < platform.y &&
                player.y + player.height > platform.y - 30;

            if (touchingStar) {
                isInvincible = true;
                invincibleStartTime = Date.now();
                platform.star = false;
            }
        }
        //spring
        if (platform.teleport) {
            teleportSound.play();
            let targetIndex = platform.index + 5; // נניח שקופץ 3 פלטפורמות קדימה
            let targetPlatform = platforms.find(p => p.index === targetIndex && p.visible);
            if (targetPlatform) {
                player.x = targetPlatform.x + targetPlatform.width / 2 - player.width / 2;
                player.y = targetPlatform.y - player.height;
                player.velY = 0;
            }
            platform.teleport = false; // שימוש חד־פעמי
        }

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

    drawGameBackground();
  
    platforms.forEach(platform => {
        const enemy = platform.enemy;
    
        if (enemy && enemy.type === 'enemy2') {
            // movement enemy 
            enemy.x += 1.5 * enemy.direction;

            // direction
            if (enemy.x <= platform.x || enemy.x + enemy.width >= platform.x + platform.width) {
                enemy.direction *= -1;
            }
        }

        //paint enemy
        if (enemy && platform.visible) {
            ctx.save(); // שמירת מצב הקנבס
            ctx.globalAlpha = 1;
            if (enemy.type === 'enemy2' && dementorImg.complete) {
                ctx.drawImage(dementorImg, enemy.x, enemy.y, enemy.width, enemy.height);
            } else if (enemy.type === 'enemy1' && ballImg.complete) {
                ctx.drawImage(ballImg, enemy.x, enemy.y - 10, enemy.width, enemy.height);
            }
            ctx.restore();
        }
        // פגיעה בשחקן
        if (enemy && platform.visible) {
            // התאמת מיקום ה־Y של האויב לפי סוג
            const enemyY = enemy.type === 'enemy1' ? enemy.y - 10 : enemy.y;
        
            const isCollision =
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemyY + enemy.height &&
                player.y + player.height > enemyY;
        
            if (isCollision && !isInvincible) {
                return triggerGameOver();
            }
        }
         
    });

    // Draw player
    if (harryImg.complete) {
        ctx.save();
        if (isInvincible) {
            ctx.globalAlpha = 0.4; // דהוי – כאילו עם גלימת היעלמות
        }
        ctx.drawImage(harryImg, player.x, player.y, player.width, player.height);
        ctx.restore();

    } else {
        // fallback בזמן טעינה
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // Draw platforms with index
    platforms.sort((a, b) => a.y - b.y);
    platforms.forEach(platform => {
    if (broomImg.complete) {
        ctx.drawImage(broomImg, platform.x - 15, platform.y - 60, platform.width , 120);
    } else {
        // fallback 
        ctx.fillStyle = 'brown';
        ctx.fillRect(platform.x, platform.y, platform.width, 10);
    }

    // Draw star
    if (platform.star && starImg.complete) {
        ctx.drawImage(starImg, platform.x + platform.width / 2 - 15, platform.y - 35, 40, 40);
    }    
    // Draw spring
    if (platform.teleport && teleportImg.complete) {
        ctx.drawImage(teleportImg, platform.x + platform.width / 2 - 20, platform.y - 40, 40, 40);
    }
            
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

    if (GameOver) {
        ctx.save();
        gameOverScale += 0.05;
        const fontSize = Math.min(120, gameOverScale * 1200); //   
    
        ctx.font = `${fontSize}px 'Mystery Quest', cursive`;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        ctx.restore();
        return; // stop movment in game
    }
    
    requestAnimationFrame(updateGame);
    }

    updateGame();