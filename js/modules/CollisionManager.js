import { Pal } from '../pal.js';
import { Smoke } from '../smoke.js';

export class CollisionManager {
    constructor(gameState, physicsEngine, uiManager) {
        this.gameState = gameState;
        this.physicsEngine = physicsEngine;
        this.uiManager = uiManager;
        this.setupCollisionHandler();
    }

    setupCollisionHandler() {
        this.physicsEngine.onCollision((event) => {
            if (this.gameState.isGameOver()) return;

            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                
                // Skip if either body is a wall
                if (this.physicsEngine.getWalls().some(wall => wall === bodyA || wall === bodyB)) return;

                // Find the Pals involved in the collision
                const palA = Array.from(this.gameState.getPals()).find(p => p.body === bodyA);
                const palB = Array.from(this.gameState.getPals()).find(p => p.body === bodyB);

                // Skip if either Pal is not found or is already being processed
                if (!palA || !palB || palA.isProcessing || palB.isProcessing) return;

                // Skip collision if either Pal is static (in drop zone)
                if (palA.type === palB.type && !palA.body.isStatic && !palB.body.isStatic) {
                    // Mark Pals as being processed to prevent duplicate merges
                    palA.isProcessing = true;
                    palB.isProcessing = true;

                    // Use requestAnimationFrame to ensure proper timing
                    requestAnimationFrame(() => {
                        this.handlePalMerge(palA, palB);
                    });
                }
            });
        });
    }

    handlePalMerge(palA, palB) {
        try {
            const nextType = Pal.TYPES[palA.type].next;
            
            if (nextType) {
                // Calculate merge position
                const midX = (palA.body.position.x + palB.body.position.x) / 2;
                const midY = (palA.body.position.y + palB.body.position.y) / 2;

                // Create smoke effect
                const smokeEffect = new Smoke(midX, midY, Pal.TYPES[palA.type].radius);
                const currentEffects = this.gameState.getSmokeEffects();
                this.gameState.setSmokeEffects([...currentEffects, smokeEffect]);

                // Create new fused Pal before removing old ones
                const fusedPal = new Pal(
                    midX,
                    midY,
                    nextType,
                    this.physicsEngine.world,
                    this.gameState.images
                );

                // Add new Pal first
                this.gameState.addPal(fusedPal);

                // Then remove old Pals
                palA.remove(this.physicsEngine.world);
                palB.remove(this.physicsEngine.world);
                this.gameState.removePal(palA);
                this.gameState.removePal(palB);

                // Update score and UI
                const newScore = this.gameState.updateScore(Pal.TYPES[nextType].score);
                this.uiManager.updateScore(newScore);
                
                // Update discovered Pals and evolution list
                const wasNewPalDiscovered = !this.gameState.getDiscoveredPals().has(nextType);
                this.gameState.getDiscoveredPals().add(nextType);
                this.uiManager.updateEvolutionList(
                    this.gameState.getDiscoveredPals(),
                    Pal.TYPES
                );

                // Check for rapid merges or new advanced Pal discovery
                const isAdvancedPal = ['LIFMUNK', 'FUACK', 'ROOBY', 'ARSOX', 'MAU', 'VERDASH', 'JETRAGON'].includes(nextType);
                if (!this.gameState.isJetragonSpinningActive()) {
                    this.gameState.setJetragonSpinning(true);
                    if (wasNewPalDiscovered && isAdvancedPal) {
                        // New advanced pal discovered - spin with glow
                        this.uiManager.spinJetragon(() => {
                            this.gameState.setJetragonSpinning(false);
                        }, true);
                    } else if (this.gameState.trackMerge()) {
                        // Rapid merges - just spin
                        this.uiManager.spinJetragon(() => {
                            this.gameState.setJetragonSpinning(false);
                        });
                    } else {
                        this.gameState.setJetragonSpinning(false);
                    }
                }

                // Check for game over after fusion
                requestAnimationFrame(() => {
                    if (this.gameState.checkGameOver(this.gameState.selectionZoneHeight)) {
                        const screenshot = document.getElementById('game-canvas').toDataURL('image/png');
                        this.uiManager.showGameOverScreen(
                            this.gameState.getScore(),
                            this.gameState.getHighScore(),
                            screenshot
                        );
                    }
                });
            }
        } catch (error) {
            console.error('Error in handlePalMerge:', error);
        } finally {
            // Clear processing flags
            if (palA) palA.isProcessing = false;
            if (palB) palB.isProcessing = false;
        }
    }

    cleanup() {
        // Remove collision handlers from physics engine
        this.physicsEngine.Events.off(this.physicsEngine.engine);
        
        // Clear references
        this.gameState = null;
        this.physicsEngine = null;
        this.uiManager = null;
    }
}
