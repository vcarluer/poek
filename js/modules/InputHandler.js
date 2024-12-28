export class InputHandler {
    constructor(canvas, callbacks) {
        this.canvas = canvas;
        this.callbacks = callbacks;
        this.currentX = 0;
        this.isProcessingAction = false;
        this.boundHandlers = {};
        this.updateInterval = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse/touch start handler
        const startHandler = async (e) => {
            if (this.callbacks.isGameOver() || this.isProcessingAction) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const rect = this.canvas.getBoundingClientRect();
            this.currentX = clientX - rect.left;
            
            if (!this.callbacks.getCurrentPal()) {
                this.isProcessingAction = true;
                
                const timeSinceLastDrop = Date.now() - this.callbacks.getLastDropTime();
                const canCreateNew = this.callbacks.canCreateNewPal() && 
                                   timeSinceLastDrop >= this.callbacks.getMinDropDelay();
                
                if (canCreateNew) {
                    await new Promise(resolve => setTimeout(resolve, 25));
                    this.callbacks.createNewPal();
                }
                
                setTimeout(() => {
                    this.isProcessingAction = false;
                }, this.callbacks.getMinDropDelay());
            }
        };

        // Mouse/touch move handler
        const moveHandler = (e) => {
            if (this.callbacks.isGameOver() || !this.callbacks.getCurrentPal()) return;
            
            if (e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (e.type.includes('touch')) {
                    if (e.touches[0]) {
                        const rect = this.canvas.getBoundingClientRect();
                        this.currentX = e.touches[0].clientX - rect.left;
                    }
                } else {
                    const rect = this.canvas.getBoundingClientRect();
                    this.currentX = e.clientX - rect.left;
                }
            }
            
            this.updatePalPosition();
        };

        // Release handler
        const releaseHandler = (e) => {
            if (this.callbacks.isGameOver()) return;
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            if (e) {
                const clientX = e.type.includes('touch') ? 
                    (e.changedTouches[0] ? e.changedTouches[0].clientX : this.currentX) : 
                    e.clientX;
                const rect = this.canvas.getBoundingClientRect();
                this.currentX = clientX - rect.left;
            }

            if (this.callbacks.getCurrentPal() && !this.isProcessingAction) {
                this.isProcessingAction = true;
                this.callbacks.dropCurrentPal(this.currentX);
                
                if (this.callbacks.getDropTimeout()) {
                    clearTimeout(this.callbacks.getDropTimeout());
                }

                const newTimeout = setTimeout(() => {
                    const checkAndCreate = () => {
                        if (this.callbacks.isGameOver() || this.callbacks.getCurrentPal()) {
                            this.isProcessingAction = false;
                            return;
                        }
                        
                        const timeSinceLastDrop = Date.now() - this.callbacks.getLastDropTime();
                        if (this.callbacks.canCreateNewPal() && 
                            timeSinceLastDrop >= this.callbacks.getMinDropDelay()) {
                            this.callbacks.createNewPal();
                            this.isProcessingAction = false;
                        } else {
                            setTimeout(checkAndCreate, 100);
                        }
                    };
                    
                    checkAndCreate();
                }, this.callbacks.getMinDropDelay());

                this.callbacks.setDropTimeout(newTimeout);
            }
        };

        // Set up continuous position update
        this.updateInterval = setInterval(() => {
            if (this.callbacks.getCurrentPal()) {
                this.updatePalPosition();
            }
        }, 16);

        // Bind handlers
        this.boundHandlers = {
            start: startHandler.bind(this),
            move: moveHandler.bind(this),
            release: releaseHandler.bind(this)
        };

        // Add event listeners
        this.canvas.addEventListener('mousedown', this.boundHandlers.start);
        this.canvas.addEventListener('touchstart', this.boundHandlers.start);
        window.addEventListener('mousemove', this.boundHandlers.move);
        window.addEventListener('touchmove', this.boundHandlers.move, { passive: false });
        window.addEventListener('mouseup', this.boundHandlers.release);
        window.addEventListener('touchend', this.boundHandlers.release);
    }

    updatePalPosition() {
        const currentPal = this.callbacks.getCurrentPal();
        if (!currentPal) return;

        const radius = this.callbacks.getPalRadius(currentPal.type);
        const minX = radius + 10;
        const maxX = this.canvas.width - radius - 10;
        const constrainedX = Math.max(minX, Math.min(maxX, this.currentX));
        
        this.callbacks.updatePalPosition(currentPal, constrainedX);
    }

    cleanup() {
        const { start, move, release } = this.boundHandlers;
        window.removeEventListener('mousemove', move);
        window.removeEventListener('touchmove', move);
        window.removeEventListener('mouseup', release);
        window.removeEventListener('touchend', release);
        this.canvas.removeEventListener('mousedown', start);
        this.canvas.removeEventListener('touchstart', start);
        clearInterval(this.updateInterval);
    }
}
