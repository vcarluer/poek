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
        if (!this.lastDroppedPal) return true;
        
        const palType = this.lastDroppedPal.type;
        const radius = this.getPalRadius(palType);
        const palTop = this.lastDroppedPal.body.position.y - radius;
        
        // Check if the last dropped Pal has moved below the selection zone
        const hasClearedZone = palTop > this.selectionZoneHeight;
        
        // Clear the lastDroppedPal reference once it's safely below
        if (hasClearedZone) {
            this.lastDroppedPal = null;
        }
        
        return hasClearedZone;
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
            const palBottom = pal.body.position.y + radius;
            const palVelocity = Math.abs(pal.body.velocity.y);
            
            // Check if the highest point of the Pal is above the selection zone line
            if (!pal.body.isStatic && palTop <= selectionZoneHeight) {
                this.gameOver = true;
                return true;
            }
        }
        
        // Check for too many Jetragons
        const jetragonCount = Array.from(this.pals)
            .filter(p => p.type === 'JETRAGON' && !p.isProcessing)
            .length;
        if (jetragonCount > 4) {
            this.gameOver = true;
            return true;
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
