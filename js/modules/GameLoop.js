export class GameLoop {
    constructor(gameState, physics, renderer, palManager) {
        this.gameState = gameState;
        this.physics = physics;
        this.renderer = renderer;
        this.palManager = palManager;
        this.isRunning = false;
        this.animationFrameId = null;
        this.boundLoop = this.loop.bind(this);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.boundLoop();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    loop() {
        // Don't continue if stopped
        if (!this.isRunning) return;

        // Request next frame first to ensure smooth animation
        this.animationFrameId = requestAnimationFrame(this.boundLoop);

        // Don't update if game is over
        if (this.gameState.isGameOver()) return;

        // Update physics
        this.physics.update();
        
        // Clear and prepare canvas
        this.renderer.clearCanvas();
        
        // Draw game elements
        this.renderer.drawWalls(this.physics.getWalls());
        this.renderer.drawAimingLine(this.gameState.getCurrentPal());
        this.renderer.drawPals(this.gameState.getPals());
        
        // Update and draw smoke effects
        const updatedEffects = this.renderer.drawSmokeEffects(this.gameState.getSmokeEffects());
        this.gameState.setSmokeEffects(updatedEffects);

        // Check for new Pal creation
        this.palManager.checkForNewPal();
    }

    restart() {
        // Stop current loop
        this.stop();
        
        // Reset physics
        this.physics.reset();
        
        // Reset game state
        this.gameState.reset();
        
        // Start loop again
        this.start();
    }

    cleanup() {
        this.stop();
        this.physics.reset();
        this.isRunning = false;
        this.animationFrameId = null;
        this.gameState = null;
        this.physics = null;
        this.renderer = null;
        this.palManager = null;
        this.boundLoop = null;
    }
}
