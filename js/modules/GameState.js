export class GameState {
    constructor() {
        this.reset();
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.minDropDelay = 300; // Minimum 0.3 second between drops
        this.safetyMargin = 100; // Pixels of extra clearance needed before next drop
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
        
        return palTop > (this.selectionZoneHeight + radius + 20);
    }

    checkGameOver(selectionZoneHeight) {
        if (this.gameOver) return true;

        // Check if any non-static Pal touches top of play zone
        for (const pal of Array.from(this.pals)) {
            if (!pal.body || !this.pals.has(pal)) continue;
            
            const radius = this.getPalRadius(pal.type);
            const palTop = pal.body.position.y - radius;
            const palBottom = pal.body.position.y + radius;
            
            if (!pal.body.isStatic && 
                palTop > selectionZoneHeight && 
                palBottom < selectionZoneHeight + radius) {
                this.gameOver = true;
                return true;
            }
        }
        
        // Check for too many Jetragons
        const jetragonCount = Array.from(this.pals).filter(p => p.type === 'JETRAGON').length;
        if (jetragonCount > 4) {
            this.gameOver = true;
            return true;
        }

        return false;
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
}
