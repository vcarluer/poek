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
        
        // Make it static initially
        this.physics.setStatic(pal.body, true);
        
        this.gameState.addPal(pal);
        this.gameState.setCurrentPal(pal);
        
        // Set next Pal type
        this.gameState.setNextType(Pal.getRandomInitialType());
        this.uiManager.updateNextPal(this.gameState.getNextType(), this.gameState.images);
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
