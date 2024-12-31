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

                // Mark both Pals as having had contact
                palA.hasHadContact = true;
                palB.hasHadContact = true;

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
                // Calculate initial merge position
                let midX = (palA.body.position.x + palB.body.position.x) / 2;
                let midY = (palA.body.position.y + palB.body.position.y) / 2;

                // Get radius of the new Pal
                const newRadius = Pal.TYPES[nextType].radius;
                
                // Check for nearby Pals and adjust position if needed
                const pals = Array.from(this.gameState.getPals());
                const safeDistance = newRadius * 1.2; // Add 20% buffer for safety
                
                // Try to find a clear spot in a spiral pattern
                let angle = 0;
                let distance = 0;
                const maxAttempts = 8; // Limit search to prevent infinite loops
                let attempts = 0;
                
                while (attempts < maxAttempts) {
                    // Check if current position has enough space
                    let hasSpace = true;
                    for (const otherPal of pals) {
                        if (otherPal === palA || otherPal === palB) continue;
                        
                        const dx = otherPal.body.position.x - midX;
                        const dy = otherPal.body.position.y - midY;
                        const minDistance = safeDistance + Pal.TYPES[otherPal.type].radius;
                        const actualDistance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (actualDistance < minDistance) {
                            hasSpace = false;
                            break;
                        }
                    }
                    
                    if (hasSpace) break;
                    
                    // Move position in a spiral pattern
                    attempts++;
                    angle += Math.PI / 2;
                    distance += newRadius * 0.5;
                    midX = (palA.body.position.x + palB.body.position.x) / 2 + Math.cos(angle) * distance;
                    midY = (palA.body.position.y + palB.body.position.y) / 2 + Math.sin(angle) * distance;
                    
                    // Keep within game bounds
                    midX = Math.max(newRadius, Math.min(midX, this.physicsEngine.canvasWidth - newRadius));
                    midY = Math.max(this.gameState.selectionZoneHeight + newRadius, 
                                  Math.min(midY, this.physicsEngine.canvasHeight - newRadius));
                }

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
                    Pal.TYPES,
                    palA.type // Pass the merged Pal type to trigger rotation animation
                );

                // Check for rapid merges or new Pal discovery
                const isAdvancedPal = ['LIFMUNK', 'FUACK', 'ROOBY', 'ARSOX', 'MAU', 'VERDASH', 'JETRAGON'].includes(nextType);
                
                // Always activate glow on new pal discovery
                if (wasNewPalDiscovered) {
                    if (!this.gameState.isJetragonSpinningActive()) {
                        this.gameState.setJetragonSpinning(true);
                        this.uiManager.spinJetragon(() => {
                            this.gameState.setJetragonSpinning(false);
                        }, true); // Always with glow for new discoveries
                    } else {
                        // If already spinning, just add glow
                        this.uiManager.glowJetragon();
                    }
                } else if (!this.gameState.isJetragonSpinningActive() && this.gameState.trackMerge()) {
                    // Rapid merges without new discovery - just spin
                    this.gameState.setJetragonSpinning(true);
                    this.uiManager.spinJetragon(() => {
                        this.gameState.setJetragonSpinning(false);
                    });
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
