    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Game settings
    const gravity = 0.5;
    const friction = 0.8;
    const baseJump = -10;
    const platformSpacing = 50; 

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
        jumping: false
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
        index: currentIndex++
    });

    let lastY = canvas.height - 50;
    while (platforms.length < 10) {
        let newY = lastY - (platformSpacing + Math.floor(Math.random() * 50));
        lastY = newY;

        let width = currentIndex % 10 === 0 ? canvas.width : 100;
        let x = width === canvas.width ? 0 : Math.random() * (canvas.width - width);

        platforms.push({
            x: x,
            y: newY,
            width: width,
            height: 10,
            index: currentIndex++
        });
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
            if (platform.y > canvas.height) {
                let newIndex = Math.max(...platforms.map(p => p.index)) + 1;
                let newY = Math.min(...platforms.map(p => p.y)) - (platformSpacing + Math.floor(Math.random() * 50));

                let width = newIndex % 10 === 0 ? canvas.width : 100;
                let x = width === canvas.width ? 0 : Math.random() * (canvas.width - width);

                platform.index = newIndex;
                platform.y = newY;
                platform.x = x;
                platform.width = width;
            }
        });
    }

    // Collision with canvas edges
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

    // Platform collision
    platforms.forEach(platform => {
    if (
        player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height > platform.y &&
        player.y + player.height < platform.y + platform.height &&
        player.velY >= 0
    ) {
        player.jumping = false;
        player.velY = 0;
        player.y = platform.y - player.height;

        if (platform.index > highestPlatformReached) {
            const jumpDistance = platform.index - highestPlatformReached;
            if (jumpDistance >= 1) {
                score += jumpDistance * 10;
                if (jumpDistance > 1) {
                    score += 50;
                }
            }
            highestPlatformReached = platform.index;
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
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(platform.index.toString(), platform.x + 5, platform.y - 5);
    }
    });

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score.toString().padStart(Math.max(4, score.toString().length), '0'), 10, 30);

    requestAnimationFrame(updateGame);
    }

    updateGame();
