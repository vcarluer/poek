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
        this.initializeEvolutionList();
        this.initializeErrorBanner();
    }

    initializeErrorBanner() {
        this.errorBanner = document.querySelector('.error-banner');
        this.errorMessage = document.querySelector('.error-message');
        this.errorCloseButton = document.querySelector('.error-close');

        if (this.errorCloseButton) {
            this.errorCloseButton.addEventListener('click', () => this.hideError());
        }
    }

    showError(message, autoHideDelay = 5000) {
        if (!this.errorBanner || !this.errorMessage) return;
        
        this.errorMessage.textContent = message;
        this.errorBanner.style.display = 'flex';
        
        // Force a reflow before adding the visible class for the animation
        void this.errorBanner.offsetWidth;
        this.errorBanner.classList.add('visible');

        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
        }

        this.errorTimeout = setTimeout(() => {
            this.hideError();
        }, autoHideDelay);
    }

    hideError() {
        if (!this.errorBanner) return;

        this.errorBanner.classList.remove('visible');
        
        // Wait for the transition to complete before hiding
        setTimeout(() => {
            this.errorBanner.style.display = 'none';
        }, 300);

        if (this.errorTimeout) {
            clearTimeout(this.errorTimeout);
            this.errorTimeout = null;
        }
    }

    initializeEvolutionList() {
        const circles = document.querySelectorAll('.pal-circle');
        circles.forEach((circle, index) => {
            // Clear any existing content
            circle.innerHTML = '';
            
            const type = this.evolutionOrder[index];
            
            // Create and append image element
            const img = document.createElement('img');
            img.alt = type;
            circle.appendChild(img);

            // Create and append question mark span
            const questionMark = document.createElement('span');
            questionMark.textContent = '?';
            circle.appendChild(questionMark);
        });
    }

    updateScore(score) {
        this.scoreElement.textContent = score;
    }

    updateNextPal(nextType, imageVariants) {
        const nextImg = this.nextPalElement.querySelector('img');
        if (nextImg && imageVariants && imageVariants[nextType]) {
            nextImg.src = imageVariants[nextType].preview.src;
            nextImg.alt = nextType.charAt(0) + nextType.slice(1).toLowerCase();
        }
    }

    updateEvolutionList(discoveredPals, palTypes, mergedType = null) {
        const circles = document.querySelectorAll('.pal-circle');
        circles.forEach((circle, index) => {
            const type = this.evolutionOrder[index];
            const palData = palTypes[type];
            const img = circle.querySelector('img');
            const isDiscovered = discoveredPals.has(type);
            const wasDiscovered = circle.classList.contains('discovered');
            const isNewlyDiscovered = isDiscovered && !wasDiscovered;
            const isSameAsMerged = type === mergedType && wasDiscovered;

            // Set color as CSS custom property
            circle.style.setProperty('--pal-color', palData.color);

            if (isDiscovered) {
                // Update image source if needed
                if (isNewlyDiscovered || !img.src.includes(type.toLowerCase())) {
                    // Use the evolution variant for the evolution list
                    const gameState = window.gameInstance?.gameState;
                    if (gameState?.images?.[type]?.evolution) {
                        img.src = gameState.images[type].evolution.src;
                    }
                }

                // Add discovered class if not already present
                if (!wasDiscovered) {
                    circle.classList.add('discovered');
                }

                // Add animation classes if needed
                if (isNewlyDiscovered) {
                    img.classList.add('bounce-in');
                } else if (isSameAsMerged) {
                    img.classList.add('rotate-once');
                }
            } else {
                // Remove discovered class if present
                circle.classList.remove('discovered');
                // Remove any animation classes
                img.classList.remove('bounce-in', 'rotate-once');
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
        
        scoreDisplay.textContent = score;
        screenshotImg.src = screenshot;
        
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
            container.style.display = 'flex';
            container.style.gap = '10px';
            
            this.testButtonCallback = callback;
            this.testButton.addEventListener('click', this.testButtonCallback);
            
            const spinButton = document.getElementById('test-spin');
            if (spinButton) {
                spinButton.addEventListener('click', () => this.spinJetragon());
            }
        } else if (container) {
            container.style.display = 'none';
        }
    }

    setupRestartButton(callback) {
        this.restartButton = this.gameOverScreen.querySelector('.restart-button');
        this.restartButtonCallback = callback;
        this.restartButton.addEventListener('click', this.restartButtonCallback);
    }

    spinJetragon(onComplete, withGlow = false) {
        if (!this.jetragonImage) {
            this.jetragonImage = document.getElementById('jetragon');
            if (!this.jetragonImage) return;
        }

        this.jetragonImage.classList.remove('spin', 'golden-glow', 'spin-and-glow');
        void this.jetragonImage.offsetWidth;
        
        const animationClass = withGlow ? 'spin-and-glow' : 'spin';
        this.jetragonImage.classList.add(animationClass);

        if (!withGlow) {
            const handleSpinEnd = () => {
                this.jetragonImage.classList.remove('spin');
                this.jetragonImage.removeEventListener('animationend', handleSpinEnd);
                if (onComplete) onComplete();
            };
            this.jetragonImage.addEventListener('animationend', handleSpinEnd);
        } else {
            const handleSpinAndGlowEnd = () => {
                this.jetragonImage.classList.remove('spin-and-glow');
                this.jetragonImage.classList.add('golden-glow');
                this.jetragonImage.removeEventListener('animationend', handleSpinAndGlowEnd);
                
                setTimeout(() => {
                    this.jetragonImage.classList.remove('golden-glow');
                    if (onComplete) onComplete();
                }, 4000);
            };
            this.jetragonImage.addEventListener('animationend', handleSpinAndGlowEnd);
        }
    }

    glowJetragon(onComplete) {
        if (!this.jetragonImage) {
            this.jetragonImage = document.getElementById('jetragon');
            if (!this.jetragonImage) return;
        }

        if (this.jetragonImage.classList.contains('spin-and-glow')) {
            return;
        }

        this.jetragonImage.classList.remove('golden-glow');
        void this.jetragonImage.offsetWidth;
        this.jetragonImage.classList.add('golden-glow');

        setTimeout(() => {
            this.jetragonImage.classList.remove('golden-glow');
            if (onComplete) onComplete();
        }, 4000);
    }

    cleanup() {
        if (this.testButton && this.testButtonCallback) {
            this.testButton.removeEventListener('click', this.testButtonCallback);
        }
        if (this.restartButton && this.restartButtonCallback) {
            this.restartButton.removeEventListener('click', this.restartButtonCallback);
        }
        if (this.errorCloseButton) {
            this.errorCloseButton.removeEventListener('click', this.hideError);
        }

        this.hideGameOverScreen();
        this.hideError();
        
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

        // Reset evolution list UI
        const circles = document.querySelectorAll('.pal-circle');
        circles.forEach(circle => {
            circle.classList.remove('discovered');
            circle.innerHTML = ''; // Remove all child elements
        });

        this.testButtonCallback = null;
        this.restartButtonCallback = null;
    }
}
