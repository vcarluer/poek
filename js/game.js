// Import Matter.js from the global scope since it's loaded via CDN
const { Engine, World, Bodies, Events } = window.Matter;

import { GameRenderer } from './modules/GameRenderer.js';
import { PhysicsEngine } from './modules/PhysicsEngine.js';
import { InputHandler } from './modules/InputHandler.js';
import { GameState } from './modules/GameState.js';
import { UIManager } from './modules/UIManager.js';
import { CollisionManager } from './modules/CollisionManager.js';
import { Pal } from './pal.js';
import { Smoke } from './smoke.js';

class Game {
    constructor() {
        try {
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }

            // Set fixed dimensions for square play area
            this.canvas.width = 393; // Fixed width for consistent gameplay
            this.selectionZoneHeight = 140; // Height for Cattiva (radius 65 * 2 + padding)
            this.playZoneHeight = 393; // Square play area matching width
            this.canvas.height = this.playZoneHeight + this.selectionZoneHeight;

            // Initialize modules
            this.gameState = new GameState();
            this.renderer = new GameRenderer(this.canvas, this.selectionZoneHeight);
            this.physics = new PhysicsEngine(this.canvas.width, this.canvas.height, this.selectionZoneHeight);
            this.uiManager = new UIManager();
            this.collisionManager = new CollisionManager(this.gameState, this.physics, this.uiManager);

            // Initialize input handler with callbacks
            this.inputHandler = new InputHandler(this.canvas, {
                isGameOver: () => this.gameState.isGameOver(),
                getCurrentPal: () => this.gameState.getCurrentPal(),
                getLastDropTime: () => this.gameState.getLastDropTime(),
                getMinDropDelay: () => this.gameState.getMinDropDelay(),
                canCreateNewPal: () => this.gameState.canCreateNewPal(),
                createNewPal: () => this.createNewPal(),
                dropCurrentPal: (x) => this.dropCurrentPal(x),
                getDropTimeout: () => this.gameState.getDropTimeout(),
                setDropTimeout: (timeout) => this.gameState.setDropTimeout(timeout),
                getPalRadius: (type) => this.gameState.getPalRadius(type),
                updatePalPosition: (pal, x) => this.physics.setPosition(pal.body, {
                    x,
                    y: pal.body.position.y
                })
            });

            // Handle resize
            window.addEventListener('resize', this.handleResize.bind(this));

            // Setup test button in dev mode
            const urlParams = new URLSearchParams(window.location.search);
            const isDev = urlParams.get('dev') === 'true';
            this.uiManager.setupTestButton(isDev, () => {
                this.gameState.setGameOver(true);
                const screenshot = this.renderer.takeScreenshot();
                this.uiManager.showGameOverScreen(
                    this.gameState.getScore(),
                    this.gameState.getHighScore(),
                    screenshot
                );
            });

            // Setup restart button
            this.uiManager.setupRestartButton(() => this.restartGame());

        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert('Failed to initialize game. Please refresh the page.');
        }
    }

    async initialize() {
        try {
            // Load Pal images
            this.images = await Pal.loadImages();
            console.log('Pal images loaded:', Object.keys(this.images));
            
            // Set initial next type
            this.gameState.setNextType(Pal.getRandomInitialType());
            
            // Update UI
            this.uiManager.updateNextPal(this.gameState.getNextType(), this.images);
            this.uiManager.updateEvolutionList(this.gameState.getDiscoveredPals(), Pal.TYPES);
            
            // Start game loop
            window.requestAnimationFrame(() => this.gameLoop());
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert('Failed to initialize game. Please refresh the page.');
        }
    }

    handleResize() {
        // Set fixed dimensions for square play area
        this.canvas.width = 393;
        this.canvas.height = this.playZoneHeight + this.selectionZoneHeight;
        
        // Reset physics engine
        this.physics = new PhysicsEngine(this.canvas.width, this.canvas.height, this.selectionZoneHeight);
    }

    createNewPal() {
        if (this.gameState.isGameOver() || this.gameState.getCurrentPal()) return;

        const type = this.gameState.getNextType();
        const radius = this.gameState.getPalRadius(type);
        
        // Create new Pal in selection zone
        const pal = new Pal(
            this.canvas.width / 2,
            this.selectionZoneHeight - radius,
            type,
            this.physics.world,
            this.images
        );
        
        // Make it static initially
        this.physics.setStatic(pal.body, true);
        
        this.gameState.addPal(pal);
        this.gameState.setCurrentPal(pal);
        
        // Set next Pal type
        this.gameState.setNextType(Pal.getRandomInitialType());
        this.uiManager.updateNextPal(this.gameState.getNextType(), this.images);
        this.uiManager.updateEvolutionList(this.gameState.getDiscoveredPals(), Pal.TYPES);
    }

    dropCurrentPal(x) {
        const currentPal = this.gameState.getCurrentPal();
        if (!currentPal) return;

        const radius = this.gameState.getPalRadius(currentPal.type);
        const minX = radius + 10;
        const maxX = this.canvas.width - radius - 10;
        const constrainedX = Math.max(minX, Math.min(maxX, x));
        
        this.physics.setPosition(currentPal.body, {
            x: constrainedX,
            y: currentPal.body.position.y
        });
        
        this.physics.setStatic(currentPal.body, false);
        this.gameState.setLastDroppedPal(currentPal);
        this.gameState.setLastDropTime(Date.now());
        this.gameState.setCurrentPal(null);
    }

    restartGame() {
        // Clean up event listeners
        if (this.inputHandler) {
            this.inputHandler.cleanup();
        }

        // Hide game over screen
        this.uiManager.hideGameOverScreen();
        
        // Reset game state
        this.gameState.reset();
        this.uiManager.updateScore(0);
        
        // Reset physics
        this.physics = new PhysicsEngine(this.canvas.width, this.canvas.height, this.selectionZoneHeight);
        
        // Reset next pal
        this.gameState.setNextType(Pal.getRandomInitialType());
        this.uiManager.updateNextPal(this.gameState.getNextType(), this.images);
        this.uiManager.updateEvolutionList(this.gameState.getDiscoveredPals(), Pal.TYPES);

        // Setup fresh event listeners
        this.inputHandler = new InputHandler(this.canvas, {
            isGameOver: () => this.gameState.isGameOver(),
            getCurrentPal: () => this.gameState.getCurrentPal(),
            getLastDropTime: () => this.gameState.getLastDropTime(),
            getMinDropDelay: () => this.gameState.getMinDropDelay(),
            canCreateNewPal: () => this.gameState.canCreateNewPal(),
            createNewPal: () => this.createNewPal(),
            dropCurrentPal: (x) => this.dropCurrentPal(x),
            getDropTimeout: () => this.gameState.getDropTimeout(),
            setDropTimeout: (timeout) => this.gameState.setDropTimeout(timeout),
            getPalRadius: (type) => this.gameState.getPalRadius(type),
            updatePalPosition: (pal, x) => this.physics.setPosition(pal.body, {
                x,
                y: pal.body.position.y
            })
        });
        
        // Restart game loop
        window.requestAnimationFrame(() => this.gameLoop());
    }

    gameLoop() {
        // Update physics unless game is over
        if (!this.gameState.isGameOver()) {
            this.physics.update();
            requestAnimationFrame(this.gameLoop.bind(this));
        }
        
        // Clear and prepare canvas
        this.renderer.clearCanvas();
        
        // Draw game elements
        this.renderer.drawWalls(this.physics.getWalls());
        this.renderer.drawAimingLine(this.gameState.getCurrentPal());
        this.renderer.drawPals(this.gameState.getPals());
        
        // Update and draw smoke effects
        const updatedEffects = this.renderer.drawSmokeEffects(this.gameState.getSmokeEffects());
        this.gameState.setSmokeEffects(updatedEffects);

        // Create initial Pal if none exists
        if (!this.gameState.getCurrentPal() && this.gameState.getPals().size === 0 && 
            !this.gameState.isGameOver()) {
            this.createNewPal();
        }
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    const game = new Game();
    game.initialize();
});
