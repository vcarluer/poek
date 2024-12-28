export class UIManager {
    constructor() {
        this.scoreElement = document.getElementById('score');
        this.nextPalElement = document.getElementById('next-pal');
        this.gameOverScreen = document.querySelector('.game-over');
        this.jetragonImage = document.getElementById('jetragon');
        this.evolutionOrder = [
            'LAMBALL', 'CHIKIPI', 'FOXPARKS', 'PENGULLET', 'CATTIVA',
            'LIFMUNK', 'FUACK', 'ROOBY', 'ARSOX', 'MAU', 'VERDASH', 'JETRAGON'
        ];
    }

    updateScore(score) {
        this.scoreElement.textContent = score;
    }

    updateNextPal(nextType, images) {
        const nextImg = this.nextPalElement.querySelector('img');
        if (nextImg && images) {
            nextImg.src = images[nextType].src;
            nextImg.alt = nextType.charAt(0) + nextType.slice(1).toLowerCase();
        }
    }

    updateEvolutionList(discoveredPals, palTypes) {
        const circles = document.querySelectorAll('.pal-circle');
        circles.forEach((circle, index) => {
            const type = this.evolutionOrder[index];
            const palData = palTypes[type];
            
            // Clear previous content
            circle.innerHTML = '';
            
            if (discoveredPals.has(type)) {
                // Show Pal image
                circle.style.backgroundColor = palData.color;
                const img = document.createElement('img');
                img.src = palData.image;
                img.alt = type;
                circle.appendChild(img);
            } else {
                // Show question mark
                circle.style.backgroundColor = 'rgba(44, 62, 80, 0.6)';
                const questionMark = document.createElement('span');
                questionMark.textContent = '?';
                questionMark.style.color = '#ecf0f1';
                questionMark.style.fontSize = '20px';
                questionMark.style.fontWeight = 'bold';
                questionMark.style.position = 'relative';
                questionMark.style.zIndex = '1';
                circle.appendChild(questionMark);
            }
        });
    }

    showGameOverScreen(score, highScore, screenshot) {
        const scoreDisplay = this.gameOverScreen.querySelector('.game-over-score');
        const screenshotImg = this.gameOverScreen.querySelector('.game-over-screenshot');
        const currentHighScore = this.gameOverScreen.querySelector('.current-high-score');
        const highScoreLabel = currentHighScore.querySelector('.high-score-label');
        const highScoreValue = currentHighScore.querySelector('.high-score-value');
        const newHighScoreDisplay = this.gameOverScreen.querySelector('.new-high-score');
        
        // Update score display
        scoreDisplay.textContent = score;
        screenshotImg.src = screenshot;
        
        // Check for new high score
        if (score > highScore) {
            newHighScoreDisplay.style.display = 'block';
            currentHighScore.style.display = 'none';
            highScoreLabel.style.display = 'none';
        } else {
            newHighScoreDisplay.style.display = 'none';
            currentHighScore.style.display = 'block';
            highScoreLabel.style.display = 'inline';
            highScoreValue.textContent = highScore;
        }
        
        // Show the game over screen
        this.gameOverScreen.classList.add('active');
    }

    hideGameOverScreen() {
        this.gameOverScreen.classList.remove('active');
        this.gameOverScreen.querySelector('.new-high-score').style.display = 'none';
    }

    setupTestButton(isDev, callback) {
        const container = document.querySelector('.test-button-container');
        this.testButton = document.getElementById('test-game-over');
        
        if (isDev && container && this.testButton) {
            // Show container
            container.style.display = 'flex';
            container.style.gap = '10px';
            
            // Setup game over test button
            this.testButtonCallback = callback;
            this.testButton.addEventListener('click', this.testButtonCallback);
            
            // Add spin test button
            const spinButton = document.createElement('button');
            spinButton.className = 'test-button';
            spinButton.textContent = 'Test Spin';
            spinButton.addEventListener('click', () => this.spinJetragon());
            container.appendChild(spinButton);
        } else if (container) {
            container.style.display = 'none';
        }
    }

    setupRestartButton(callback) {
        this.restartButton = this.gameOverScreen.querySelector('.restart-button');
        this.restartButtonCallback = callback;
        this.restartButton.addEventListener('click', this.restartButtonCallback);
    }

    spinJetragon(onComplete) {
        if (!this.jetragonImage) {
            this.jetragonImage = document.getElementById('jetragon');
            if (!this.jetragonImage) return;
        }

        // Get current Y position
        const rect = this.jetragonImage.getBoundingClientRect();
        const currentY = rect.top;

        // Set current Y position as CSS variable
        this.jetragonImage.style.setProperty('--current-y', `${currentY}px`);

        // Add spin class
        this.jetragonImage.classList.add('spin');

        // Reset after animation
        setTimeout(() => {
            this.jetragonImage.classList.remove('spin');
            this.jetragonImage.style.removeProperty('--current-y');
            if (onComplete) onComplete();
        }, 500);
    }

    cleanup() {
        // Remove event listeners
        if (this.testButton && this.testButtonCallback) {
            this.testButton.removeEventListener('click', this.testButtonCallback);
        }
        if (this.restartButton && this.restartButtonCallback) {
            this.restartButton.removeEventListener('click', this.restartButtonCallback);
        }

        // Reset UI state
        this.hideGameOverScreen();
        if (this.scoreElement) {
            this.scoreElement.textContent = '0';
        }
        if (this.nextPalElement) {
            const nextImg = this.nextPalElement.querySelector('img');
            if (nextImg) {
                nextImg.src = '';
                nextImg.alt = '';
            }
        }

        // Clear references
        this.testButtonCallback = null;
        this.restartButtonCallback = null;
    }
}
