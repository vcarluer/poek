class Game {
    constructor() {
        try {
            this.dropTimeout = null;
            this.lastDroppedPal = null;
            this.minDropDelay = 300; // Minimum 0.3 second between drops
            this.lastDropTime = 0; // Track when the last Pal was dropped
            this.safetyMargin = 100; // Pixels of extra clearance needed before next drop
            this.discoveredPals = new Set(['LAMBALL']); // Start with LAMBALL discovered
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }

            // Set canvas size based on viewport - using mobile ratio for consistency
            this.canvas.width = Math.min(window.innerWidth * 0.9, 450);
            // Use mobile height ratio for all devices
            this.canvas.height = window.innerHeight * 0.85;
            
            // Define zones - set to Cattiva's diameter (radius 40 * 2 = 80)
            this.selectionZoneHeight = 80;
            this.playZoneHeight = this.canvas.height - this.selectionZoneHeight;

            // Get context after setting size
            this.ctx = this.canvas.getContext('2d', {
                alpha: false,
                willReadFrequently: true
            });
            if (!this.ctx) {
                throw new Error('Could not get canvas context');
            }

            this.scoreElement = document.getElementById('score');
            this.nextPalElement = document.getElementById('next-pal');

            // Configure context for better image quality
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            // Initial canvas clear
            this.ctx.fillStyle = '#34495e';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Initialize Matter.js engine
            this.engine = Matter.Engine.create();
            this.world = this.engine.world;
            
            // Use mobile gravity for consistent physics
            this.engine.world.gravity.x = 0;
            this.engine.world.gravity.y = 1.0;

            this.score = 0;
            this.gameOver = false;
            this.currentPal = null;
            this.nextType = Pal.getRandomInitialType();
            this.pals = new Set();
            this.images = null;

            // Wall styling
            this.wallStyle = {
                fillStyle: '#2c3e50',
                strokeStyle: '#34495e'
            };

            // Create walls for the play zone
            this.createWalls();

            // Setup collision detection
            Matter.Events.on(this.engine, 'collisionStart', this.handleCollision.bind(this));

            // Setup event listeners
            this.setupEventListeners();

            // Handle resize
            window.addEventListener('resize', this.handleResize.bind(this));
        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert('Failed to initialize game. Please refresh the page.');
        }
    }

    handleResize() {
        // Update canvas size - using mobile ratio for consistency
        this.canvas.width = Math.min(window.innerWidth * 0.9, 450);
        this.canvas.height = window.innerHeight * 0.85;
        
        // Update zones - set to Cattiva's diameter (radius 40 * 2 = 80)
        this.selectionZoneHeight = 80;
        this.playZoneHeight = this.canvas.height - this.selectionZoneHeight;
        
            // Use mobile gravity for consistent physics
            this.engine.world.gravity.y = 1.0;
        
        // Recreate walls with new dimensions
        Matter.World.remove(this.world, this.walls);
        this.createWalls();
    }

    async initialize() {
        try {
            // Load Pal images
            this.images = await Pal.loadImages();
            console.log('Pal images loaded:', Object.keys(this.images));
            
            // Force a clean state
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Start game loop
            window.requestAnimationFrame(() => this.gameLoop());
            
            // Update next Pal display and evolution list
            this.updateNextPal();
            this.updateEvolutionList();
        } catch (error) {
            console.error('Failed to initialize game:', error);
            alert('Failed to initialize game. Please refresh the page.');
        }
    }

    createWalls() {
        const wallOptions = {
            isStatic: true,
            render: { visible: true },
            restitution: 0.7,
            friction: 0.05
        };

        // Bottom wall
        this.walls = [
            Matter.Bodies.rectangle(
                this.canvas.width / 2,
                this.canvas.height,
                this.canvas.width,
                20,
                wallOptions
            ),
            // Left wall (only in play zone)
            Matter.Bodies.rectangle(
                0,
                this.selectionZoneHeight + (this.playZoneHeight / 2),
                20,
                this.playZoneHeight,
                wallOptions
            ),
            // Right wall (only in play zone)
            Matter.Bodies.rectangle(
                this.canvas.width,
                this.selectionZoneHeight + (this.playZoneHeight / 2),
                20,
                this.playZoneHeight,
                wallOptions
            )
        ];

        Matter.World.add(this.world, this.walls);
    }

    setupEventListeners() {
        let currentX = 0;
        let isProcessingAction = false;

        // Mouse/touch start handler
        const startHandler = async (e) => {
            if (this.gameOver || isProcessingAction) return;
            
            // Prevent default browser behavior for all events
            e.preventDefault();
            e.stopPropagation();
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const rect = this.canvas.getBoundingClientRect();
            currentX = clientX - rect.left;
            
            if (!this.currentPal) {
                isProcessingAction = true;
                
                // Check if we can create a new Pal
                const timeSinceLastDrop = Date.now() - this.lastDropTime;
                const canCreateNew = this.canCreateNewPal() && timeSinceLastDrop >= this.minDropDelay;
                
                if (canCreateNew) {
                    await new Promise(resolve => setTimeout(resolve, 25)); // Small delay for better control
                    this.createNewPal();
                }
                
                // Reset processing flag after a minimum delay
                setTimeout(() => {
                    isProcessingAction = false;
                }, this.minDropDelay);
            }
        };

        // Mouse/touch move handler
        const moveHandler = (e) => {
            if (this.gameOver || !this.currentPal) return;
            
            if (e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (e.type.includes('touch')) {
                    if (e.touches[0]) {
                        const rect = this.canvas.getBoundingClientRect();
                        currentX = e.touches[0].clientX - rect.left;
                    }
                } else {
                    const rect = this.canvas.getBoundingClientRect();
                    currentX = e.clientX - rect.left;
                }
            }
            
            // Always update position when there's a current Pal
            const radius = Pal.TYPES[this.currentPal.type].radius;
            const minX = radius + 10;
            const maxX = this.canvas.width - radius - 10;
            const constrainedX = Math.max(minX, Math.min(maxX, currentX));
            
            Matter.Body.setPosition(this.currentPal.body, {
                x: constrainedX,
                y: this.currentPal.body.position.y
            });
        };

        // Set up continuous position update for current Pal
        const updateInterval = setInterval(() => {
            if (this.currentPal) {
                const radius = Pal.TYPES[this.currentPal.type].radius;
                const minX = radius + 10;
                const maxX = this.canvas.width - radius - 10;
                const constrainedX = Math.max(minX, Math.min(maxX, currentX));
                
                Matter.Body.setPosition(this.currentPal.body, {
                    x: constrainedX,
                    y: this.currentPal.body.position.y
                });
            }
        }, 16); // ~60fps update rate

        // Helper method to drop the current Pal
        this.dropCurrentPal = (x) => {
            const radius = Pal.TYPES[this.currentPal.type].radius;
            const minX = radius + 10;
            const maxX = this.canvas.width - radius - 10;
            const constrainedX = Math.max(minX, Math.min(maxX, x));
            
            Matter.Body.setPosition(this.currentPal.body, {
                x: constrainedX,
                y: this.currentPal.body.position.y
            });
            
            Matter.Body.setStatic(this.currentPal.body, false);
            this.lastDroppedPal = this.currentPal;
            this.lastDropTime = Date.now();
            this.currentPal = null;
        };

        // Release handler
        const releaseHandler = (e) => {
            if (this.gameOver) return;
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Get final position from the event if available
            if (e) {
                const clientX = e.type.includes('touch') ? 
                    (e.changedTouches[0] ? e.changedTouches[0].clientX : currentX) : 
                    e.clientX;
                const rect = this.canvas.getBoundingClientRect();
                currentX = clientX - rect.left;
            }

            // Drop the Pal if we have one and we're not processing an action
            if (this.currentPal && !isProcessingAction) {
                isProcessingAction = true;
                this.dropCurrentPal(currentX);
                
                // Clear any existing timeout
                if (this.dropTimeout) {
                    clearTimeout(this.dropTimeout);
                }

                // Schedule next Pal creation with proper delay
                this.dropTimeout = setTimeout(() => {
                    const checkAndCreate = () => {
                        if (this.gameOver || this.currentPal) {
                            isProcessingAction = false;
                            return;
                        }
                        
                        const timeSinceLastDrop = Date.now() - this.lastDropTime;
                        if (this.canCreateNewPal() && timeSinceLastDrop >= this.minDropDelay) {
                            this.createNewPal();
                            isProcessingAction = false;
                        } else {
                            // Check again in a short interval
                            setTimeout(checkAndCreate, 100);
                        }
                    };
                    
                    checkAndCreate();
                }, this.minDropDelay);
            }
        };

        // Bind all handlers to maintain context and scope
        const boundStartHandler = startHandler.bind(this);
        const boundMoveHandler = moveHandler.bind(this);
        const boundReleaseHandler = releaseHandler.bind(this);
        
        // Store bound handlers for cleanup
        this.boundHandlers = {
            start: boundStartHandler,
            move: boundMoveHandler,
            release: boundReleaseHandler
        };
        
        // Add event listeners - use window for mouse/touch events to track outside canvas
        this.canvas.addEventListener('mousedown', boundStartHandler);
        this.canvas.addEventListener('touchstart', boundStartHandler);
        window.addEventListener('mousemove', boundMoveHandler);
        window.addEventListener('touchmove', boundMoveHandler, { passive: false });
        window.addEventListener('mouseup', boundReleaseHandler);
        window.addEventListener('touchend', boundReleaseHandler);
        
        // Clean up window listeners and interval when game is over
        this.cleanupListeners = () => {
            const { start, move, release } = this.boundHandlers;
            window.removeEventListener('mousemove', move);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('mouseup', release);
            window.removeEventListener('touchend', release);
            this.canvas.removeEventListener('mousedown', start);
            this.canvas.removeEventListener('touchstart', start);
            clearInterval(updateInterval);
            delete this.boundHandlers;
        };
    }

    canCreateNewPal() {
        if (!this.lastDroppedPal) return true;
        
        const palType = this.lastDroppedPal.type;
        const radius = Pal.TYPES[palType].radius;
        const palBottom = this.lastDroppedPal.body.position.y + radius;
        
        // Check if the last dropped Pal is fully in the play zone plus safety margin
        return palBottom < (this.canvas.height - this.safetyMargin);
    }

    createNewPal() {
        if (this.gameOver || this.currentPal) return;

        const type = this.nextType;
        const radius = Pal.TYPES[type].radius;
        
        // Create new Pal in selection zone
        const pal = new Pal(
            this.canvas.width / 2,
            this.selectionZoneHeight - radius, // Position Pal at bottom of selection zone
            type,
            this.world,
            this.images
        );
        
        // Make it static initially
        Matter.Body.setStatic(pal.body, true);
        
        this.pals.add(pal);
        this.currentPal = pal;
        
        // Set next Pal type and add to discovered
        this.nextType = Pal.getRandomInitialType();
        this.discoveredPals.add(type);
        this.updateNextPal();
        this.updateEvolutionList();
    }

    updateNextPal() {
        const nextImg = this.nextPalElement.querySelector('img');
        if (nextImg && this.images) {
            nextImg.src = this.images[this.nextType].src;
            nextImg.alt = this.nextType.charAt(0) + this.nextType.slice(1).toLowerCase();
        }
    }

    handleCollision(event) {
        if (this.gameOver) return;

        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            
            // Skip if either body is a wall
            if (this.walls.some(wall => wall === bodyA || wall === bodyB)) return;

            const palA = Array.from(this.pals).find(p => p.body === bodyA);
            const palB = Array.from(this.pals).find(p => p.body === bodyB);

            // Skip collision if either Pal is static (in drop zone)
            if (palA && palB && palA.type === palB.type && 
                !palA.body.isStatic && !palB.body.isStatic) {
                const nextType = Pal.TYPES[palA.type].next;
                
                if (nextType) {
                    // Remove collided Pals
                    palA.remove(this.world);
                    palB.remove(this.world);
                    this.pals.delete(palA);
                    this.pals.delete(palB);

                    // Create new fused Pal
                    const midX = (bodyA.position.x + bodyB.position.x) / 2;
                    const midY = (bodyA.position.y + bodyB.position.y) / 2;
                    
                    const fusedPal = new Pal(
                        midX,
                        midY,
                        nextType,
                        this.world,
                        this.images
                    );
                    
                    this.pals.add(fusedPal);

                    // Update score
                    this.score += Pal.TYPES[nextType].score;
                    this.scoreElement.textContent = this.score;
                    
                    // Update discovered Pals and evolution list
                    this.discoveredPals.add(nextType);
                    this.updateEvolutionList();

                    // Check for game over after fusion
                    setTimeout(() => this.checkGameOver(), 0);
                }
            }
        });
    }

    checkGameOver() {
        if (this.gameOver) return;

        // 1. Check if any non-static Pal touches top of play zone
        for (const pal of Array.from(this.pals)) {
            if (!pal.body || !this.pals.has(pal)) continue; // Skip if pal was removed
            
            // Only check Pals that have been dropped (not in selection zone)
            if (!pal.body.isStatic && 
                pal.body.position.y > this.selectionZoneHeight && 
                pal.body.position.y < this.selectionZoneHeight + Pal.TYPES[pal.type].radius) {
                this.gameOver = true;
                alert(`Game Over! Score ${this.score}`);
                return;
            }
        }
        
        // 2. Check for too many Jetragons
        const jetragonCount = Array.from(this.pals).filter(p => p.type === 'JETRAGON').length;
        if (jetragonCount > 4) {
            this.gameOver = true;
            alert(`Game Over! Too many Jetragons (${jetragonCount}/4). Score ${this.score}`);
        }
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    updateEvolutionList() {
        const evolutionOrder = [
            'LAMBALL', 'CHIKIPI', 'FOXPARKS', 'PENGULLET', 'CATTIVA',
            'LIFMUNK', 'FUACK', 'ROOBY', 'ARSOX', 'MAU', 'VERDASH', 'JETRAGON'
        ];

        const circles = document.querySelectorAll('.pal-circle');
        circles.forEach((circle, index) => {
            const type = evolutionOrder[index];
            const palData = Pal.TYPES[type];
            
            // Clear previous content
            circle.innerHTML = '';
            
            if (this.discoveredPals.has(type)) {
                // Show Pal image
                circle.style.backgroundColor = palData.color;
                const img = document.createElement('img');
                img.src = palData.image;
                img.alt = type;
                circle.appendChild(img);
            } else {
                // Show question mark
                circle.style.backgroundColor = 'rgba(44, 62, 80, 0.6)';
                const questionMark = document.createElement('span');
                questionMark.textContent = '?';
                questionMark.style.color = '#ecf0f1';
                questionMark.style.fontSize = '20px';
                questionMark.style.fontWeight = 'bold';
                questionMark.style.position = 'relative';
                questionMark.style.zIndex = '1';
                circle.appendChild(questionMark);
            }
        });
    }

    gameLoop() {
        if (!this.gameOver) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }

        Matter.Engine.update(this.engine);
        
        // Clear canvas with background color
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw selection zone with different color
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.selectionZoneHeight);
        
        // Draw separator line
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.fillRect(0, this.selectionZoneHeight - 2, this.canvas.width, 4);

        // Draw walls
        this.walls.forEach(wall => {
            this.ctx.fillStyle = this.wallStyle.fillStyle;
            this.ctx.strokeStyle = this.wallStyle.strokeStyle;
            this.ctx.beginPath();
            const vertices = wall.vertices;
            this.ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                this.ctx.lineTo(vertices[i].x, vertices[i].y);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
        });

        // Draw aiming line if there's a current Pal
        if (this.currentPal) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Semi-transparent white
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]); // Dashed line
            this.ctx.moveTo(this.currentPal.body.position.x, this.currentPal.body.position.y);
            this.ctx.lineTo(this.currentPal.body.position.x, this.canvas.height);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line style
            this.ctx.lineWidth = 1;
        }
        
        // Draw Pals
        this.pals.forEach(pal => pal.draw(this.ctx));

        // Create initial Pal if none exists
        if (!this.currentPal && this.pals.size === 0) {
            this.createNewPal();
        }
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    const game = new Game();
    game.initialize();
});
