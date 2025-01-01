import { Pal } from '../pal.js';

export class GameState {
    constructor(selectionZoneHeight, uiManager) {
        this.selectionZoneHeight = selectionZoneHeight;
        this.uiManager = uiManager;
        this.reset();
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.minDropDelay = 300; // Minimum 0.3 second between drops
        this.safetyMargin = 100; // Pixels of extra clearance needed before next drop
        this.recentMerges = []; // Track recent merges timestamps
        this.isJetragonSpinning = false; // Track if JetRagon spin animation is active
        this.gameOverTimeout = null; // Timeout for delayed game over
        
        // Make instance globally available for UI components
        window.gameInstance = {
            gameState: this
        };
    }

    reset() {
        this.score = 0;
        this.gameOver = false;
        this.currentPal = null;
        this.lastDroppedPal = null;
        this.lastDropTime = 0;
        this.dropTimeout = null;
        this.discoveredPals = new Set(['LAMBALL']); // Start with LAMBALL discovered
        this.pals = new Set();
        this.nextType = null;
        this.smokeEffects = [];
        this.images = null;
        this.recentMerges = []; // Reset merge tracking
        this.isJetragonSpinning = false; // Reset Jetragon animation state
        if (this.gameOverTimeout) {
            clearTimeout(this.gameOverTimeout);
            this.gameOverTimeout = null;
        }
    }

    setImages(imageVariants) {
        this.images = imageVariants;
    }

    updateScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
        }
        return this.score;
    }

    canCreateNewPal() {
        // Always allow new Pal creation
        return true;
    }

    checkGameOver(selectionZoneHeight) {
        if (this.gameOver) return true;

        // Check if any non-static Pal touches top of play zone
        for (const pal of Array.from(this.pals)) {
            if (!pal.body || !this.pals.has(pal)) continue;
            
            // Skip the current selected Pal and last dropped Pal
            if (pal === this.currentPal || pal === this.lastDroppedPal) continue;
            
            const radius = this.getPalRadius(pal.type);
            const palTop = pal.body.position.y - radius;
            
            // Check if any non-static Pal is above the selection zone line
            if (!pal.body.isStatic && palTop <= selectionZoneHeight && pal.hasHadContact) {
                if (!this.gameOverTimeout) {
                    console.log(`Game over countdown started by ${pal.type}`);
                    
                    // Start blinking for Pals above the line that have had contact
                    for (const p of this.pals) {
                        if (p !== this.currentPal && p.hasHadContact && p.isAboveLine(selectionZoneHeight)) {
                            p.startBlinking();
                        }
                    }
                    
                    this.gameOverTimeout = setTimeout(() => {
                        // Re-check the pal's position
                        if (this.pals.has(pal) && pal.body && !pal.body.isStatic) {
                            const currentPalTop = pal.body.position.y - this.getPalRadius(pal.type);
                            if (currentPalTop <= selectionZoneHeight) {
                                console.log(`Game over triggered by ${pal.type}`);
                                this.gameOver = true;
                                
                                // Stop all blinking
                                for (const p of this.pals) {
                                    p.stopBlinking();
                                }
                                
                                // Set collision filter for all existing Pals to prevent interactions
                                for (const existingPal of this.pals) {
                                    if (existingPal.body) {
                                        existingPal.body.collisionFilter = {
                                            group: -1,
                                            category: 0x0002,
                                            mask: 0x0000
                                        };
                                    }
                                }
                                
                                // Make the triggering Pal static
                                if (pal.body) {
                                    pal.body.isStatic = true;
                                }
                                
                                // Take a screenshot and show game over screen
                                const screenshot = document.getElementById('game-canvas').toDataURL('image/png');
                                this.uiManager.showGameOverScreen(
                                    this.getScore(),
                                    this.getHighScore(),
                                    screenshot
                                );
                            }
                        }
                        this.gameOverTimeout = null;
                    }, 3000);
                } else {
                    // During countdown, update blinking state for Pals that have had contact
                    for (const p of this.pals) {
                        if (p !== this.currentPal && p.hasHadContact) {
                            if (p.isAboveLine(selectionZoneHeight)) {
                                if (!p.isBlinking) p.startBlinking();
                            } else {
                                if (p.isBlinking) p.stopBlinking();
                            }
                        }
                    }
                }
                return false; // Don't return game over until timeout completes
            }
        }
        
        // If we get here and there's no game over countdown, make sure no Pals are blinking
        if (!this.gameOverTimeout) {
            for (const p of this.pals) {
                if (p.isBlinking) p.stopBlinking();
            }
        }
        
        return false;
    }

    removePal(pal) {
        if (!pal) return;
        
        // Clear any references
        if (this.currentPal === pal) {
            this.currentPal = null;
        }
        if (this.lastDroppedPal === pal) {
            this.lastDroppedPal = null;
        }
        
        // Remove from set
        this.pals.delete(pal);
    }

    getPalRadius(type) {
        return Pal.TYPES[type].radius;
    }

    // Getters
    getScore() { return this.score; }
    getHighScore() { return this.highScore; }
    getCurrentPal() { return this.currentPal; }
    getLastDroppedPal() { return this.lastDroppedPal; }
    getLastDropTime() { return this.lastDropTime; }
    getDropTimeout() { return this.dropTimeout; }
    getMinDropDelay() { return this.minDropDelay; }
    getNextType() { return this.nextType; }
    getPals() { return this.pals; }
    getDiscoveredPals() { return this.discoveredPals; }
    getSmokeEffects() { return this.smokeEffects; }
    isGameOver() { return this.gameOver; }

    // Setters
    setCurrentPal(pal) { this.currentPal = pal; }
    setLastDroppedPal(pal) { this.lastDroppedPal = pal; }
    setLastDropTime(time) { this.lastDropTime = time; }
    setDropTimeout(timeout) { this.dropTimeout = timeout; }
    setNextType(type) { 
        const isNewDiscovery = type && !this.discoveredPals.has(type);
        const advancedPals = ['LIFMUNK', 'FUACK', 'ROOBY', 'ARSOX', 'MAU', 'VERDASH', 'JETRAGON'];
        const isAdvancedPal = advancedPals.includes(type);
        
        this.nextType = type;
        if (type) {
            this.discoveredPals.add(type);
            // Trigger special effects for newly discovered advanced pals
            if (isNewDiscovery && isAdvancedPal) {
                this.uiManager.spinJetragon(null, true);
            }
        }
    }
    addPal(pal) { this.pals.add(pal); }
    removePal(pal) { this.pals.delete(pal); }
    setSmokeEffects(effects) { this.smokeEffects = effects; }
    setGameOver(value) { this.gameOver = value; }

    // Track merges for rapid merge detection
    trackMerge() {
        const now = Date.now();
        // Remove merges older than 1 second
        this.recentMerges = this.recentMerges.filter(time => now - time < 1000);
        // Add new merge
        this.recentMerges.push(now);
        
        // Check if we have 3 merges in the last second
        return this.recentMerges.length >= 3;
    }

    setJetragonSpinning(value) {
        this.isJetragonSpinning = value;
    }

    isJetragonSpinningActive() {
        return this.isJetragonSpinning;
    }
}
