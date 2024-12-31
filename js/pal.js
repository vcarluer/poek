export class Pal {
    static TYPES = {
        LAMBALL: { radius: 10, score: 2, next: 'CHIKIPI', image: 'assets/lamball.png', color: '#F8E8E8' },
        CHIKIPI: { radius: 15, score: 4, next: 'FOXPARKS', image: 'assets/chikipi.png', color: '#FFE5B4' },
        FOXPARKS: { radius: 21, score: 8, next: 'PENGULLET', image: 'assets/foxparks.png', color: '#FF7F50' },
        PENGULLET: { radius: 31, score: 16, next: 'CATTIVA', image: 'assets/pengullet.png', color: '#87CEEB' },
        CATTIVA: { radius: 45, score: 32, next: 'LIFMUNK', image: 'assets/cattiva.png', color: '#DDA0DD' },
        LIFMUNK: { radius: 65, score: 64, next: 'FUACK', image: 'assets/lifmunk.png', color: '#90EE90' },
        FUACK: { radius: 94, score: 128, next: 'ROOBY', image: 'assets/fuack.png', color: '#4682B4' },
        ROOBY: { radius: 136, score: 256, next: 'ARSOX', image: 'assets/rooby.png', color: '#CD5C5C' },
        ARSOX: { radius: 197, score: 512, next: 'MAU', image: 'assets/arsox.png', color: '#FF4500' },
        MAU: { radius: 286, score: 768, next: 'VERDASH', image: 'assets/mau.png', color: '#9370DB' },
        VERDASH: { radius: 340, score: 896, next: 'JETRAGON', image: 'assets/verdash.png', color: '#32CD32' },
        JETRAGON: { radius: 393, score: 1024, next: null, image: 'assets/jetragon.png', color: '#4169E1' }
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

    static async processImage(sourceImage, size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas with transparency
        ctx.clearRect(0, 0, size, size);
        
        // Create circular clipping path
        ctx.beginPath();
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw the image
        ctx.drawImage(sourceImage, 0, 0, size, size);
        
        // Create a new image from the canvas
        const processedImage = new Image();
        processedImage.src = canvas.toDataURL('image/png');
        
        // Wait for the image to load
        return new Promise((resolve, reject) => {
            processedImage.onload = () => resolve(processedImage);
            processedImage.onerror = reject;
        });
    }

    static loadImages() {
        return new Promise((resolve) => {
            const imageVariants = {};
            let loadedTypes = 0;
            const totalTypes = Object.keys(Pal.TYPES).length;

            for (const type in Pal.TYPES) {
                imageVariants[type] = {};
                const baseImage = new Image();
                
                baseImage.onload = async () => {
                    try {
                        // Create variants for different contexts
                        const [preview, game, evolution] = await Promise.all([
                            // Preview variant (fixed size)
                            Pal.processImage(baseImage, Pal.PREVIEW_SIZE),
                            // Game variant (based on pal radius)
                            Pal.processImage(baseImage, Pal.TYPES[type].radius * 2),
                            // Evolution variant (small fixed size)
                            Pal.processImage(baseImage, Pal.EVOLUTION_SIZE)
                        ]);

                        imageVariants[type] = {
                            preview,
                            game,
                            evolution
                        };

                        loadedTypes++;
                        console.log(`Processed variants for ${type}`);
                        
                        if (loadedTypes === totalTypes) {
                            console.log('All image variants processed successfully');
                            resolve(imageVariants);
                        }
                    } catch (error) {
                        console.error(`Error processing variants for ${type}:`, error);
                    }
                };
                
                baseImage.onerror = (err) => {
                    console.error(`Failed to load image for ${type}:`, err);
                };
                
                baseImage.src = Pal.TYPES[type].image;
                console.log(`Loading image for ${type}: ${Pal.TYPES[type].image}`);
            }
        });
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
