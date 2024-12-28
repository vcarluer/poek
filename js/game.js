import { GameRenderer } from './modules/GameRenderer.js';
import { PhysicsEngine } from './modules/PhysicsEngine.js';
import { InputHandler } from './modules/InputHandler.js';
import { GameState } from './modules/GameState.js';
import { UIManager } from './modules/UIManager.js';
import { CollisionManager } from './modules/CollisionManager.js';
import { PalManager } from './modules/PalManager.js';
import { GameLoop } from './modules/GameLoop.js';
import { Pal } from './pal.js';

// Wait for Matter.js to be available
async function waitForMatter() {
    while (!window.Matter) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.Matter;
}

class Game {
    constructor() {
        try {
            this.initializeCanvas();
            this.initializeModules();
            this.setupEventHandlers();
            this.setupDevMode();
            
            // Handle window unload
            window.addEventListener('unload', () => this.cleanup());
        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert('Failed to initialize game. Please refresh the page.');
        }
    }

    initializeCanvas() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        // Set fixed dimensions for square play area
        this.canvas.width = 393; // Fixed width for consistent gameplay
        this.selectionZoneHeight = 140; // Height for Cattiva (radius 65 * 2 + padding)
        this.playZoneHeight = 393; // Square play area matching width
        this.canvas.height = this.playZoneHeight + this.selectionZoneHeight;
    }

    initializeModules() {
        // Core game modules
        this.gameState = new GameState(this.selectionZoneHeight);
        this.renderer = new GameRenderer(this.canvas, this.selectionZoneHeight);
        this.physics = new PhysicsEngine(this.canvas.width, this.canvas.height, this.selectionZoneHeight);
        this.uiManager = new UIManager();

        // Game management modules
        this.palManager = new PalManager(this.canvas, this.gameState, this.physics, this.uiManager);
        this.collisionManager = new CollisionManager(this.gameState, this.physics, this.uiManager);
        this.gameLoop = new GameLoop(this.gameState, this.physics, this.renderer, this.palManager);

        // Input handling
        this.inputHandler = new InputHandler(this.canvas, {
            isGameOver: () => this.gameState.isGameOver(),
            getCurrentPal: () => this.gameState.getCurrentPal(),
            getLastDropTime: () => this.gameState.getLastDropTime(),
            getMinDropDelay: () => this.gameState.getMinDropDelay(),
            canCreateNewPal: () => this.gameState.canCreateNewPal(),
            createNewPal: () => this.palManager.createNewPal(),
            dropCurrentPal: (x) => this.palManager.dropCurrentPal(x),
            getDropTimeout: () => this.gameState.getDropTimeout(),
            setDropTimeout: (timeout) => this.gameState.setDropTimeout(timeout),
            getPalRadius: (type) => this.gameState.getPalRadius(type),
            updatePalPosition: (pal, x) => this.physics.setPosition(pal.body, {
                x,
                y: pal.body.position.y
            })
        });
    }

    setupEventHandlers() {
        // Handle window resize
        this.handleResize = () => {
            this.canvas.width = 393;
            this.canvas.height = this.playZoneHeight + this.selectionZoneHeight;
            this.physics = new PhysicsEngine(this.canvas.width, this.canvas.height, this.selectionZoneHeight);
        };
        window.addEventListener('resize', this.handleResize);

        // Setup restart button
        this.uiManager.setupRestartButton(() => this.restartGame());
    }

    setupDevMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const isDev = urlParams.get('dev') === 'true';
        
        if (isDev) {
            this.uiManager.setupTestButton(true, () => {
                this.gameState.setGameOver(true);
                const screenshot = this.renderer.takeScreenshot();
                this.uiManager.showGameOverScreen(
                    this.gameState.getScore(),
                    this.gameState.getHighScore(),
                    screenshot
                );
            });
        }
    }

    async initialize() {
        try {
            // Load Pal images
            const images = await Pal.loadImages();
            console.log('Pal images loaded:', Object.keys(images));
            
            // Set images and initial next type
            this.gameState.setImages(images);
            this.gameState.setNextType(Pal.getRandomInitialType());
            
            // Update UI
            this.uiManager.updateNextPal(this.gameState.getNextType(), images);
            this.uiManager.updateEvolutionList(this.gameState.getDiscoveredPals(), Pal.TYPES);
            
            // Start game loop
            this.gameLoop.start();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert('Failed to initialize game. Please refresh the page.');
        }
    }

    restartGame() {
        try {
            // Stop and cleanup current game
            if (this.gameLoop) {
                this.gameLoop.cleanup();
            }
            if (this.inputHandler) {
                this.inputHandler.cleanup();
            }

            // Hide game over screen
            this.uiManager.hideGameOverScreen();
            
            // Reset game state and UI
            this.gameState.reset();
            this.uiManager.updateScore(0);
            
            // Reset next pal
            this.gameState.setNextType(Pal.getRandomInitialType());
            this.uiManager.updateNextPal(this.gameState.getNextType(), this.gameState.images);
            this.uiManager.updateEvolutionList(this.gameState.getDiscoveredPals(), Pal.TYPES);

            // Reinitialize modules with fresh state
            this.initializeModules();
            
            // Start new game loop
            this.gameLoop.start();
        } catch (error) {
            console.error('Failed to restart game:', error);
            alert('Failed to restart game. Please refresh the page.');
        }
    }

    cleanup() {
        try {
            // Stop game loop
            if (this.gameLoop) {
                this.gameLoop.cleanup();
            }

            // Cleanup input handling
            if (this.inputHandler) {
                this.inputHandler.cleanup();
            }

            // Cleanup UI
            if (this.uiManager) {
                this.uiManager.cleanup();
            }

            // Cleanup renderer
            if (this.renderer) {
                this.renderer.cleanup();
            }

            // Cleanup physics
            if (this.physics) {
                this.physics.cleanup();
            }

            // Remove event listeners
            window.removeEventListener('resize', this.handleResize);
            window.removeEventListener('unload', this.cleanup);

            // Clear references
            this.gameState = null;
            this.renderer = null;
            this.physics = null;
            this.uiManager = null;
            this.palManager = null;
            this.collisionManager = null;
            this.gameLoop = null;
            this.inputHandler = null;
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Initialize game when Matter.js is loaded
waitForMatter().then(Matter => {
    const { Engine, World, Bodies, Events } = Matter;
    window.addEventListener('load', () => {
        const game = new Game();
        game.initialize();
    });
}).catch(console.error);
