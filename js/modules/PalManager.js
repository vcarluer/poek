import { Pal } from '../pal.js';

export class PalManager {
    constructor(canvas, gameState, physics, uiManager) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.physics = physics;
        this.uiManager = uiManager;
    }

    createNewPal() {
        if (this.gameState.getCurrentPal()) return;

        const type = this.gameState.getNextType();
        const radius = this.gameState.getPalRadius(type);
        
        // Create new Pal in selection zone
        const pal = new Pal(
            this.canvas.width / 2,
            this.gameState.selectionZoneHeight - radius,
            type,
            this.physics.world,
            this.gameState.images
        );
        
        // If the Pal is created below the selection zone (e.g. through dev tools),
        // mark it as having had contact
        if (pal.body.position.y > this.gameState.selectionZoneHeight) {
            pal.hasHadContact = true;
        }
        
        // Set collision filter to prevent collisions while in selection zone
        pal.body.collisionFilter = {
            group: -1,  // Negative group means it won't collide with anything in the same group
            category: 0x0002,  // Special category for selection zone Pals
            mask: 0x0000  // Don't collide with anything while in selection zone
        };
        
        // Make it static initially
        this.physics.setStatic(pal.body, true);
        
        this.gameState.addPal(pal);
        this.gameState.setCurrentPal(pal);
        
        // Set next Pal type
        this.gameState.setNextType(Pal.getRandomInitialType());
        this.updateUI();
    }

    dropCurrentPal(x) {
        const currentPal = this.gameState.getCurrentPal();
        if (!currentPal) return;

        const radius = this.gameState.getPalRadius(currentPal.type);
        const minX = radius + 10;
        const maxX = this.canvas.width - radius - 10;
        const constrainedX = Math.max(minX, Math.min(maxX, x));

        // Check for collisions with pals in the launch area
        const existingPals = Array.from(this.gameState.getPals());
        for (const pal of existingPals) {
            if (pal === currentPal || !pal.body) continue;
            
            // Only check pals in the launch area
            if (pal.body.position.y > this.gameState.selectionZoneHeight + 100) continue;
            
            const palRadius = this.gameState.getPalRadius(pal.type);
            const dx = pal.body.position.x - constrainedX;
            const dy = pal.body.position.y - currentPal.body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = radius + palRadius;
            
            console.log('Drop position check:', {
                existingPal: pal.type,
                distance,
                minDistance,
                x1: pal.body.position.x,
                x2: constrainedX,
                y1: pal.body.position.y,
                y2: currentPal.body.position.y
            });
            
            // Prevent drop if there's a collision with any Pal in the launch area
            if (distance < minDistance) {
                console.log('Drop prevented: collision with pal in launch area');
                // Only reset position when drop is prevented
                this.physics.setPosition(currentPal.body, {
                    x: this.canvas.width / 2,
                    y: this.gameState.selectionZoneHeight - radius
                });
                return;
            }
        }
        
        // Update position first
        this.physics.setPosition(currentPal.body, {
            x: constrainedX,
            y: currentPal.body.position.y
        });
        
        // Update game state
        this.gameState.setLastDroppedPal(currentPal);
        this.gameState.setLastDropTime(Date.now());
        
        // Update UI before changing physics state
        this.updateUI();
        
        // Make the Pal dynamic after UI update
        requestAnimationFrame(() => {
            // Set normal collision filter for gameplay
            currentPal.body.collisionFilter = {
                group: 0,  // Default group
                category: 0x0001,  // Default category
                mask: 0x0001  // Collide with default category
            };
            this.physics.setStatic(currentPal.body, false);
            this.gameState.setCurrentPal(null);
        });
    }

    updateUI() {
        // Update next Pal preview
        this.uiManager.updateNextPal(this.gameState.getNextType(), this.gameState.images);
        // Update evolution list
        this.uiManager.updateEvolutionList(this.gameState.getDiscoveredPals(), Pal.TYPES);
    }

    checkForNewPal() {
        if (!this.gameState.getCurrentPal()) {
            const timeSinceLastDrop = Date.now() - this.gameState.getLastDropTime();
            if (timeSinceLastDrop >= this.gameState.getMinDropDelay() && 
                this.gameState.canCreateNewPal()) {
                this.createNewPal();
            }
        }
    }

    cleanup() {
        // Remove all pals from physics world
        const pals = this.gameState.getPals();
        pals.forEach(pal => {
            if (pal.body) {
                this.physics.removeBody(pal.body);
            }
        });
        
        // Clear references
        this.canvas = null;
        this.gameState = null;
        this.physics = null;
        this.uiManager = null;
    }
}
