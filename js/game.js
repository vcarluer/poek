import { GameRenderer } from './modules/GameRenderer.js';
import { PhysicsEngine } from './modules/PhysicsEngine.js';
import { InputHandler } from './modules/InputHandler.js';
import { GameState } from './modules/GameState.js';
import { UIManager } from './modules/UIManager.js';
import { CollisionManager } from './modules/CollisionManager.js';
import { PalManager } from './modules/PalManager.js';
import { GameLoop } from './modules/GameLoop.js';
import { Pal } from './pal.js';
import { ImageCache } from './modules/ImageCache.js';

// Wait for Matter.js to be available
async function waitForMatter() {
    while (!window.Matter) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return window.Matter;
}

class Game {
    constructor() {
        this.lastSpawnTime = 0; // Move to class level
        this.spawnCooldown = 500; // Move cooldown constant to class level
        
        try {
            this.initializeCanvas();
            this.initializeModules();
            this.setupEventHandlers();
            this.setupDevMode();
            
            // Handle window unload
            window.addEventListener('unload', () => this.cleanup());
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.uiManager.showError('Failed to initialize game. Please refresh the page.', 10000);
        }
    }

    initializeCanvas() {
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        // Set fixed dimensions for square play area
        this.canvas.width = 393; // Fixed width for consistent gameplay
        this.selectionZoneHeight = 100; // Height for Cattiva (radius 45 * 2 + padding)
        this.playZoneHeight = 393; // Square play area matching width
        this.canvas.height = this.playZoneHeight + this.selectionZoneHeight;
    }

    initializeModules() {
        // Core game modules
        this.uiManager = new UIManager();
        this.gameState = new GameState(this.selectionZoneHeight, this.uiManager);
        this.renderer = new GameRenderer(this.canvas, this.selectionZoneHeight);
        this.physics = new PhysicsEngine(this.canvas.width, this.canvas.height, this.selectionZoneHeight);

        // Game management modules
        this.palManager = new PalManager(this.canvas, this.gameState, this.physics, this.uiManager);
        this.collisionManager = new CollisionManager(this.gameState, this.physics, this.uiManager);
        this.gameLoop = new GameLoop(this.gameState, this.physics, this.renderer, this.palManager);

        // Input handling
        this.inputHandler = new InputHandler(this.canvas, {
            isGameOver: () => this.gameState.isGameOver(),
            isGameStarted: () => this.gameState.isGameStarted(),
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
        
        // Setup test buttons through UIManager
        this.uiManager.setupTestButton(isDev, () => {
            this.gameState.setGameOver(true);
            const screenshot = this.renderer.takeScreenshot();
            this.uiManager.showGameOverScreen(
                this.gameState.getScore(),
                this.gameState.getHighScore(),
                screenshot
            );
        });

        if (isDev) {

            // Setup Jetragon spin test
            document.getElementById('test-spin')?.addEventListener('click', () => {
                this.uiManager.spinJetragon();
            });

            // Setup spawn buttons for each Pal type
            Object.keys(Pal.TYPES).forEach(type => {
                const button = document.getElementById(`spawn-${type.toLowerCase()}`);
                if (button) {
                    button.addEventListener('click', () => {
                        const now = Date.now();
                        if (now - this.lastSpawnTime < this.spawnCooldown) {
                            return; // Skip if cooldown hasn't elapsed
                        }
                        this.lastSpawnTime = now;

                        // Create Pal directly in play area
                        const radius = Pal.TYPES[type].radius;
                        const pal = new Pal(
                            this.canvas.width / 2,
                            this.canvas.height / 2,
                            type,
                            this.physics.world,
                            this.gameState.images
                        );
                        pal.hasHadContact = true; // Mark as having had contact since it's in play area
                        this.physics.setStatic(pal.body, false); // Ensure Pal is not static
                        this.gameState.addPal(pal);
                    });
                }
            });
        }
    }

    updateLoadingProgress(progress) {
        const loadingBar = document.querySelector('.loading-bar');
        const loadingProgress = document.querySelector('.loading-progress');
        if (loadingBar && loadingProgress) {
            loadingBar.style.width = `${progress}%`;
            loadingProgress.textContent = `${progress}%`;
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }

    setupStartButton() {
        const startButton = document.querySelector('.start-button');
        const titleContainer = document.querySelector('.title-container');
        const gameContainer = document.querySelector('.game-container');

        if (startButton) {
            startButton.addEventListener('click', () => {
                if (titleContainer) titleContainer.style.display = 'none';
                if (gameContainer) gameContainer.style.display = 'block';
                this.gameState.setGameStarted(true);
            });
        }
    }

    async initialize() {
        try {
            // Load cached images with progress tracking
            this.updateLoadingProgress(0);
            this.setupStartButton();
            console.log('Loading cached images...');
            const images = await Pal.loadImages(progress => {
                // Scale progress from 50-100%
                this.updateLoadingProgress(50 + Math.floor(progress / 2));
            });
            console.log('Pal images loaded:', Object.keys(images));
            
            // Hide loading screen
            this.hideLoadingScreen();
            
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
            this.uiManager.showError('Failed to initialize game. Please refresh the page.', 10000);
        }
    }

    async restartGame() {
        try {
            // Stop the game loop first
            if (this.gameLoop) {
                this.gameLoop.stop();
            }

            // Store necessary references
            const images = this.gameState ? this.gameState.images : null;
            
            // Clean up all modules in reverse order of initialization
            if (this.inputHandler) this.inputHandler.cleanup();
            if (this.gameLoop) this.gameLoop.cleanup();
            if (this.collisionManager) this.collisionManager.cleanup();
            if (this.palManager) this.palManager.cleanup();
            if (this.physics) this.physics.cleanup();
            if (this.renderer) this.renderer.cleanup();
            if (this.uiManager) {
                this.uiManager.hideGameOverScreen();
                this.uiManager.cleanup();
            }

            // Reset spawn cooldown
            this.lastSpawnTime = 0;

            // Clear all references
            this.gameLoop = null;
            this.inputHandler = null;
            this.physics = null;
            this.palManager = null;
            this.collisionManager = null;
            this.renderer = null;
            this.uiManager = null;
            this.gameState = null;

            // Reinitialize canvas and modules
            this.initializeCanvas();
            this.initializeModules();
            this.setupEventHandlers();
            this.setupDevMode();

            // Restore game state
            if (images) {
                this.gameState.setImages(images);
                this.gameState.setNextType(Pal.getRandomInitialType());
                this.uiManager.initializeEvolutionList(); // Reinitialize evolution list
                this.uiManager.updateNextPal(this.gameState.getNextType(), images);
                this.uiManager.updateEvolutionList(this.gameState.getDiscoveredPals(), Pal.TYPES);
            }

            // Keep game container visible and start new game immediately
            const titleContainer = document.querySelector('.title-container');
            const gameContainer = document.querySelector('.game-container');
            if (titleContainer) titleContainer.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'block';
            this.gameState.setGameStarted(true);

            // Start the game loop
            this.gameLoop.start();
        } catch (error) {
            console.error('Failed to restart game:', error);
            this.uiManager.showError('Failed to restart game. Please refresh the page.', 10000);
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
