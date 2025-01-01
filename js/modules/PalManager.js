import { Pal } from '../pal.js';

export class PalManager {
    constructor(canvas, gameState, physics, uiManager) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.physics = physics;
        this.uiManager = uiManager;
    }

    createNewPal() {
        if (this.gameState.isGameOver() || this.gameState.getCurrentPal()) return;

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

        // Check if there's already a pal at this position
        const existingPals = Array.from(this.gameState.getPals());
        for (const pal of existingPals) {
            if (pal === currentPal || !pal.body) continue;
            
            // Only check pals that are near the top
            if (pal.body.position.y > this.gameState.selectionZoneHeight + 100) continue;
            
            const palRadius = this.gameState.getPalRadius(pal.type);
            const distance = Math.abs(pal.body.position.x - constrainedX);
            const minDistance = (radius + palRadius) * 0.8; // Allow some overlap
            
            console.log('Drop position check:', {
                existingPal: pal.type,
                distance,
                minDistance,
                x1: pal.body.position.x,
                x2: constrainedX
            });
            
            // Only prevent if there's significant overlap
            if (distance < minDistance) {
                console.log('Drop prevented: too close to existing pal');
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
