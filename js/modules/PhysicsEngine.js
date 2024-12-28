const { Engine, World, Bodies, Body, Events } = window.Matter;

export class PhysicsEngine {
    constructor(canvasWidth, canvasHeight, selectionZoneHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.selectionZoneHeight = selectionZoneHeight;
        this.initializeEngine();
    }

    initializeEngine() {
        // Initialize Matter.js engine
        this.engine = Engine.create();
        this.world = this.engine.world;
        
        // Use mobile gravity for consistent physics
        this.world.gravity.x = 0;
        this.world.gravity.y = 1.0;

        // Create walls
        this.createWalls();
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
            Bodies.rectangle(
                this.canvasWidth / 2,
                this.canvasHeight,
                this.canvasWidth,
                20,
                wallOptions
            ),
            // Left wall (only in play zone)
            Bodies.rectangle(
                0,
                this.selectionZoneHeight + (this.canvasHeight - this.selectionZoneHeight) / 2,
                20,
                this.canvasHeight - this.selectionZoneHeight,
                wallOptions
            ),
            // Right wall (only in play zone)
            Bodies.rectangle(
                this.canvasWidth,
                this.selectionZoneHeight + (this.canvasHeight - this.selectionZoneHeight) / 2,
                20,
                this.canvasHeight - this.selectionZoneHeight,
                wallOptions
            )
        ];

        World.add(this.world, this.walls);
    }

    update() {
        Engine.update(this.engine);
    }

    reset() {
        World.clear(this.world);
        Engine.clear(this.engine);
        this.initializeEngine();
    }

    addBody(body) {
        World.add(this.world, body);
    }

    removeBody(body) {
        World.remove(this.world, body);
    }

    setStatic(body, isStatic) {
        Body.setStatic(body, isStatic);
    }

    setPosition(body, position) {
        Body.setPosition(body, position);
    }

    getWalls() {
        return this.walls;
    }

    onCollision(callback) {
        Events.on(this.engine, 'collisionStart', callback);
    }
}
