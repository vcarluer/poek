import { ImageCache, SIZES } from './modules/ImageCache.js';

export class Pal {
    static TYPES = {
        LAMBALL: { radius: 10, score: 2, next: 'CHIKIPI', name: 'lamball', color: '#F8E8E8' },
        CHIKIPI: { radius: 15, score: 4, next: 'FOXPARKS', name: 'chikipi', color: '#FFE5B4' },
        FOXPARKS: { radius: 21, score: 8, next: 'PENGULLET', name: 'foxparks', color: '#FF7F50' },
        PENGULLET: { radius: 31, score: 16, next: 'CATTIVA', name: 'pengullet', color: '#87CEEB' },
        CATTIVA: { radius: 45, score: 32, next: 'LIFMUNK', name: 'cattiva', color: '#DDA0DD' },
        LIFMUNK: { radius: 65, score: 64, next: 'FUACK', name: 'lifmunk', color: '#90EE90' },
        FUACK: { radius: 94, score: 128, next: 'ROOBY', name: 'fuack', color: '#4682B4' },
        ROOBY: { radius: 136, score: 256, next: 'ARSOX', name: 'rooby', color: '#CD5C5C' },
        ARSOX: { radius: 197, score: 512, next: 'MAU', name: 'arsox', color: '#FF4500' },
        MAU: { radius: 286, score: 768, next: 'VERDASH', name: 'mau', color: '#9370DB' },
        VERDASH: { radius: 340, score: 896, next: 'JETRAGON', name: 'verdash', color: '#32CD32' },
        JETRAGON: { radius: 393, score: 1024, next: null, name: 'jetragon', color: '#4169E1' }
    };

    static calculateProbabilities() {
        const initialTypes = ['LAMBALL', 'CHIKIPI', 'FOXPARKS', 'PENGULLET', 'CATTIVA'];
        
        // Calculate weights using logarithmic curve
        const weights = initialTypes.map(type => {
            const radius = Pal.TYPES[type].radius;
            return Math.log(100/radius) * Math.pow(1/radius, 2);
        });
        
        // Calculate total weight for normalization
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        // Calculate and return probabilities as percentages
        return initialTypes.map((type, index) => ({
            type,
            probability: (weights[index] / totalWeight) * 100
        }));
    }

    static getRandomInitialType() {
        // Only return one of the first five Pal types for initial drops with weighted probabilities
        const initialTypes = ['LAMBALL', 'CHIKIPI', 'FOXPARKS', 'PENGULLET', 'CATTIVA'];
        
        // Calculate weights using logarithmic curve
        const weights = initialTypes.map(type => {
            const radius = Pal.TYPES[type].radius;
            return Math.log(100/radius) * Math.pow(1/radius, 2);
        });
        
        // Calculate total weight for normalization
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        // Generate a random value between 0 and total weight
        let random = Math.random() * totalWeight;
        
        // Select PAL based on weighted probability
        for (let i = 0; i < initialTypes.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return initialTypes[i];
            }
        }
        
        // Fallback (should never reach here due to math, but just in case)
        return initialTypes[0];
    }

    // Size constants for different display contexts
    static PREVIEW_SIZE = 200;
    static EVOLUTION_SIZE = 50;

    static async loadImages(onProgress) {
        // Initialize the image cache first
        await ImageCache.initialize();
        
        const imageVariants = {};
        const totalTypes = Object.keys(Pal.TYPES).length;
        let loadedTypes = 0;
        
        for (const type in Pal.TYPES) {
            const name = Pal.TYPES[type].name;
            
            try {
                // Load all cached variants
                const preview = new Image();
                preview.src = ImageCache.getCachePath(name, 'large');
                
                const game = new Image();
                game.src = ImageCache.getCachePath(name, 'medium');
                
                const evolution = new Image();
                evolution.src = ImageCache.getCachePath(name, 'small');
                
                // Wait for all images to load
                await Promise.all([
                    new Promise(resolve => preview.onload = resolve),
                    new Promise(resolve => game.onload = resolve),
                    new Promise(resolve => evolution.onload = resolve)
                ]);
                
                imageVariants[type] = { preview, game, evolution };
                loadedTypes++;
                onProgress?.(Math.floor((loadedTypes / totalTypes) * 100));
                
                console.log(`Loaded cached variants for ${type}`);
            } catch (error) {
                console.error(`Error loading cached variants for ${type}:`, error);
            }
        }
        
        console.log('All cached image variants loaded successfully');
        return imageVariants;
    }

    constructor(x, y, type, world, imageVariants) {
        if (!window.Matter) {
            throw new Error('Matter.js not loaded');
        }
        
        const { Bodies, World } = window.Matter;
        
        this.type = type;
        this.isGlowing = false;
        const { radius } = Pal.TYPES[type];
        
        // Create the Matter.js body with size-proportional density
        // Using quadratic scaling to make larger Pals significantly heavier
        const baseDensity = 0.001;
        const density = baseDensity * Math.pow(radius / 10, 2); // Quadratic scaling relative to smallest Pal
        
        this.body = Bodies.circle(x, y, radius, {
            restitution: 0.3, // Slightly reduced bounciness for more stable stacking
            friction: 0.4, // Increased friction for better stability
            density: density, // Density scales with size
            label: type,
            slop: 0.05, // Reduce jittering
            // Removed inertia: Infinity to allow rotation
        });

        // Add the body to the world
        World.add(world, this.body);

        // Store image variants
        this.imageVariants = imageVariants[type];
    }

    draw(ctx) {
        const pos = this.body.position;
        const radius = Pal.TYPES[this.type].radius;
        
        try {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(this.body.angle);
            
            // Draw colored background circle with shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = this.type === 'JETRAGON' ? '#FFD700' : Pal.TYPES[this.type].color;
            ctx.fill();

            // Add glow effect if active
            if (this.isGlowing || this.type === 'JETRAGON') {
                ctx.shadowColor = 'gold';
                ctx.shadowBlur = 20;
                ctx.strokeStyle = 'gold';
                ctx.lineWidth = 4;
                ctx.stroke();
            }
            
            // Reset shadow for image
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Draw Pal image if available
            if (this.imageVariants?.game && this.imageVariants.game.complete && this.imageVariants.game.naturalWidth > 0) {
                try {
                    // Create circular clipping path
                    ctx.beginPath();
                    ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
                    ctx.clip();
                    
                    // Calculate size to fill the circle (2x radius for better fit)
                    const size = radius * 2;
                    const x = -radius;
                    const y = -radius;
                    
                    // Draw the game-sized variant with better quality
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(this.imageVariants.game, x, y, size, size);
                } catch (err) {
                    console.error('Error drawing Pal image:', err);
                }
            }
            
            // Draw border
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.stroke();
            
        } catch (err) {
            console.error('Error in Pal draw:', err);
        } finally {
            ctx.restore();
        }
    }

    remove(world) {
        if (!window.Matter) {
            throw new Error('Matter.js not loaded');
        }
        const { World } = window.Matter;
        World.remove(world, this.body);
    }
}
