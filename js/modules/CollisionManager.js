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

                const palA = Array.from(this.gameState.getPals()).find(p => p.body === bodyA);
                const palB = Array.from(this.gameState.getPals()).find(p => p.body === bodyB);

                // Skip collision if either Pal is static (in drop zone)
                if (palA && palB && palA.type === palB.type && 
                    !palA.body.isStatic && !palB.body.isStatic) {
                    this.handlePalMerge(palA, palB);
                }
            });
        });
    }

    handlePalMerge(palA, palB) {
        const nextType = Pal.TYPES[palA.type].next;
        
        if (nextType) {
            // Remove collided Pals
            palA.remove(this.physicsEngine.world);
            palB.remove(this.physicsEngine.world);
            this.gameState.removePal(palA);
            this.gameState.removePal(palB);

            // Create smoke effect at merge point
            const midX = (palA.body.position.x + palB.body.position.x) / 2;
            const midY = (palA.body.position.y + palB.body.position.y) / 2;
            const smokeEffect = new Smoke(midX, midY, Pal.TYPES[palA.type].radius);
            
            // Update smoke effects
            const currentEffects = this.gameState.getSmokeEffects();
            this.gameState.setSmokeEffects([...currentEffects, smokeEffect]);
            
            // Create new fused Pal
            const fusedPal = new Pal(
                midX,
                midY,
                nextType,
                this.physicsEngine.world,
                this.gameState.images
            );
            
            this.gameState.addPal(fusedPal);

            // Update score
            const newScore = this.gameState.updateScore(Pal.TYPES[nextType].score);
            this.uiManager.updateScore(newScore);
            
            // Update discovered Pals and evolution list
            this.gameState.getDiscoveredPals().add(nextType);
            this.uiManager.updateEvolutionList(
                this.gameState.getDiscoveredPals(),
                Pal.TYPES
            );

            // Check for game over after fusion
            setTimeout(() => {
                if (this.gameState.checkGameOver(this.gameState.selectionZoneHeight)) {
                    const screenshot = document.getElementById('game-canvas').toDataURL('image/png');
                    this.uiManager.showGameOverScreen(
                        this.gameState.getScore(),
                        this.gameState.getHighScore(),
                        screenshot
                    );
                }
            }, 0);
        }
    }
}
