export class GameLoop {
    constructor(gameState, physics, renderer, palManager) {
        this.gameState = gameState;
        this.physics = physics;
        this.renderer = renderer;
        this.palManager = palManager;
        this.isRunning = false;
        this.animationFrameId = null;
        this.boundLoop = this.loop.bind(this);
        
        // Fixed timestep for physics (60 FPS)
        this.fixedTimeStep = 1000 / 60;
        this.lastTime = 0;
        this.accumulator = 0;
        this.alpha = 0;
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

    loop(currentTime = 0) {
        // Don't continue if stopped
        if (!this.isRunning) return;

        // Request next frame first to ensure smooth animation
        this.animationFrameId = requestAnimationFrame(this.boundLoop);

        // Don't update if game is over
        if (this.gameState.isGameOver()) return;

        // Calculate time delta
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            return;
        }

        let frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Prevent spiral of death
        if (frameTime > 250) {
            frameTime = 250;
        }

        // Accumulate time for physics updates
        this.accumulator += frameTime;

        // Update physics with fixed timestep
        while (this.accumulator >= this.fixedTimeStep) {
            this.physics.update();
            this.accumulator -= this.fixedTimeStep;
        }

        // Calculate interpolation alpha
        this.alpha = this.accumulator / this.fixedTimeStep;

        // Clear and prepare canvas
        this.renderer.clearCanvas();
        
        // Draw game elements with interpolation
        this.renderer.setInterpolationAlpha(this.alpha);
        this.renderer.drawWalls(this.physics.getWalls());
        this.renderer.drawAimingLine(this.gameState.getCurrentPal());
        this.renderer.drawPals(this.gameState.getPals());
        
        // Update and draw smoke effects
        const updatedEffects = this.renderer.drawSmokeEffects(this.gameState.getSmokeEffects());
        this.gameState.setSmokeEffects(updatedEffects);

        // Check for new Pal creation
        this.palManager.checkForNewPal();

        // Check for game over after all updates are complete
        if (this.gameState.checkGameOver(this.gameState.selectionZoneHeight)) {
            const screenshot = document.getElementById('game-canvas').toDataURL('image/png');
            this.gameState.uiManager.showGameOverScreen(
                this.gameState.getScore(),
                this.gameState.getHighScore(),
                screenshot
            );
            return; // Exit the loop immediately when game over is detected
        }
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
