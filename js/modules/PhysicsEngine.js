export class PhysicsEngine {
    constructor(canvasWidth, canvasHeight, selectionZoneHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.selectionZoneHeight = selectionZoneHeight;
        this.initializeEngine();
    }

    initializeEngine() {
        // Initialize Matter.js engine
        this.engine = Matter.Engine.create();
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
            Matter.Bodies.rectangle(
                this.canvasWidth / 2,
                this.canvasHeight,
                this.canvasWidth,
                20,
                wallOptions
            ),
            // Left wall (only in play zone)
            Matter.Bodies.rectangle(
                0,
                this.selectionZoneHeight + (this.canvasHeight - this.selectionZoneHeight) / 2,
                20,
                this.canvasHeight - this.selectionZoneHeight,
                wallOptions
            ),
            // Right wall (only in play zone)
            Matter.Bodies.rectangle(
                this.canvasWidth,
                this.selectionZoneHeight + (this.canvasHeight - this.selectionZoneHeight) / 2,
                20,
                this.canvasHeight - this.selectionZoneHeight,
                wallOptions
            )
        ];

        Matter.World.add(this.world, this.walls);
    }

    update() {
        Matter.Engine.update(this.engine);
    }

    reset() {
        Matter.World.clear(this.world);
        Matter.Engine.clear(this.engine);
        this.initializeEngine();
    }

    addBody(body) {
        Matter.World.add(this.world, body);
    }

    removeBody(body) {
        Matter.World.remove(this.world, body);
    }

    setStatic(body, isStatic) {
        Matter.Body.setStatic(body, isStatic);
    }

    setPosition(body, position) {
        Matter.Body.setPosition(body, position);
    }

    getWalls() {
        return this.walls;
    }

    onCollision(callback) {
        Matter.Events.on(this.engine, 'collisionStart', callback);
    }
}
