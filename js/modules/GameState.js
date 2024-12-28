import { Pal } from '../pal.js';

export class GameState {
    constructor(selectionZoneHeight) {
        this.selectionZoneHeight = selectionZoneHeight;
        this.reset();
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.minDropDelay = 300; // Minimum 0.3 second between drops
        this.safetyMargin = 100; // Pixels of extra clearance needed before next drop
        this.recentMerges = []; // Track recent merges timestamps
        this.isJetragonSpinning = false; // Track if JetRagon spin animation is active
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
    }

    setImages(images) {
        this.images = images;
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
        return palTop > this.selectionZoneHeight;
    }

    checkGameOver(selectionZoneHeight) {
        if (this.gameOver) return true;

        // Check if any non-static Pal touches top of play zone
        for (const pal of Array.from(this.pals)) {
            if (!pal.body || !this.pals.has(pal)) continue;
            
            // Skip the current selected Pal and recently dropped Pals
            if (pal === this.currentPal || 
                pal === this.lastDroppedPal || 
                Date.now() - this.lastDropTime < 500) continue;
            
            const radius = this.getPalRadius(pal.type);
            const palTop = pal.body.position.y - radius;
            const palBottom = pal.body.position.y + radius;
            const palVelocity = Math.abs(pal.body.velocity.y);
            
            // Check if Pal is in the selection zone, not static, and has relatively low velocity
            if (!pal.body.isStatic && 
                palTop <= selectionZoneHeight + radius && 
                palBottom >= selectionZoneHeight - radius &&
                palVelocity < 2) { // Only trigger game over if the Pal is moving slowly
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
        this.nextType = type;
        if (type) this.discoveredPals.add(type);
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
