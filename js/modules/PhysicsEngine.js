export class PhysicsEngine {
    constructor(canvasWidth, canvasHeight, selectionZoneHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.selectionZoneHeight = selectionZoneHeight;
        
        // Wait for Matter.js to be available
        if (!window.Matter) {
            throw new Error('Matter.js not loaded');
        }
        
        const { Engine, World, Bodies, Body, Events } = window.Matter;
        this.Engine = Engine;
        this.World = World;
        this.Bodies = Bodies;
        this.Body = Body;
        this.Events = Events;
        
        this.initializeEngine();
    }

    initializeEngine() {
        // Initialize Matter.js engine
        this.engine = this.Engine.create();
        this.world = this.engine.world;
        
        // Use stronger gravity for better gameplay feel
        this.world.gravity.x = 0;
        this.world.gravity.y = 2.0;

        // Create walls
        this.createWalls();
    }

    createWalls() {
        const wallOptions = {
            isStatic: true,
            render: { visible: true },
            restitution: 0.3,
            friction: 0.1
        };

        // Bottom wall
        this.walls = [
            this.Bodies.rectangle(
                this.canvasWidth / 2,
                this.canvasHeight,
                this.canvasWidth,
                20,
                wallOptions
            ),
            // Left wall (only in play zone)
            this.Bodies.rectangle(
                0,
                this.selectionZoneHeight + (this.canvasHeight - this.selectionZoneHeight) / 2,
                20,
                this.canvasHeight - this.selectionZoneHeight,
                wallOptions
            ),
            // Right wall (only in play zone)
            this.Bodies.rectangle(
                this.canvasWidth,
                this.selectionZoneHeight + (this.canvasHeight - this.selectionZoneHeight) / 2,
                20,
                this.canvasHeight - this.selectionZoneHeight,
                wallOptions
            )
        ];

        this.World.add(this.world, this.walls);
    }

    update() {
        // Use fixed time step for consistent physics
        this.Engine.update(this.engine, 1000 / 60);
    }

    reset() {
        // Remove collision listeners
        this.Events.off(this.engine);
        
        // Clear world and engine
        this.World.clear(this.world);
        this.Engine.clear(this.engine);
        
        // Reinitialize engine with fresh state
        this.initializeEngine();
    }

    cleanup() {
        // Remove collision listeners
        this.Events.off(this.engine);
        
        // Clear world and engine
        this.World.clear(this.world);
        this.Engine.clear(this.engine);
        
        // Clear references
        this.engine = null;
        this.world = null;
        this.walls = null;
    }

    addBody(body) {
        this.World.add(this.world, body);
    }

    removeBody(body) {
        this.World.remove(this.world, body);
    }

    setStatic(body, isStatic) {
        this.Body.setStatic(body, isStatic);
    }

    setPosition(body, position) {
        this.Body.setPosition(body, position);
    }

    getWalls() {
        return this.walls;
    }

    onCollision(callback) {
        this.Events.on(this.engine, 'collisionStart', callback);
    }
}
