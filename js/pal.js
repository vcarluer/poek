class Pal {
    static TYPES = {
        LAMBALL: { radius: 20, score: 2, next: 'CHIKIPI', image: 'assets/lamball.png', color: '#F8E8E8' },
        CHIKIPI: { radius: 25, score: 4, next: 'FOXPARKS', image: 'assets/chikipi.png', color: '#FFE5B4' },
        FOXPARKS: { radius: 30, score: 8, next: 'PENGULLET', image: 'assets/foxparks.png', color: '#FF7F50' },
        PENGULLET: { radius: 35, score: 16, next: 'CATTIVA', image: 'assets/pengullet.png', color: '#87CEEB' },
        CATTIVA: { radius: 40, score: 32, next: 'LIFMUNK', image: 'assets/cattiva.png', color: '#DDA0DD' },
        LIFMUNK: { radius: 45, score: 64, next: 'FUACK', image: 'assets/lifmunk.png', color: '#90EE90' },
        FUACK: { radius: 50, score: 128, next: 'ROOBY', image: 'assets/fuack.png', color: '#4682B4' },
        ROOBY: { radius: 55, score: 256, next: 'ARSOX', image: 'assets/rooby.png', color: '#CD5C5C' },
        ARSOX: { radius: 60, score: 512, next: 'MAU', image: 'assets/arsox.png', color: '#FF4500' },
        MAU: { radius: 65, score: 768, next: 'VERDASH', image: 'assets/mau.png', color: '#9370DB' },
        VERDASH: { radius: 68, score: 896, next: 'JETRAGON', image: 'assets/verdash.png', color: '#32CD32' },
        JETRAGON: { radius: 70, score: 1024, next: null, image: 'assets/jetragon.png', color: '#4169E1' }
    };

    static getRandomInitialType() {
        // Only return one of the first five Pal types for initial drops with weighted probabilities
        const initialTypes = ['LAMBALL', 'CHIKIPI', 'FOXPARKS', 'PENGULLET', 'CATTIVA'];
        
        // Calculate weights using logarithmic curve for more extreme probability differences
        const weights = initialTypes.map(type => {
            const radius = Pal.TYPES[type].radius;
            // Use log scale and square the inverse relationship for more dramatic effect
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

    static loadImages() {
        return new Promise((resolve) => {
            const images = {};
            let loadedImages = 0;
            const totalImages = Object.keys(Pal.TYPES).length;

            for (const type in Pal.TYPES) {
                images[type] = new Image();
                images[type].onload = () => {
                    loadedImages++;
                    console.log(`Loaded image for ${type}`);
                    if (loadedImages === totalImages) {
                        console.log('All images loaded successfully');
                        resolve(images);
                    }
                };
                images[type].onerror = (err) => {
                    console.error(`Failed to load image for ${type}:`, err);
                };
                images[type].src = Pal.TYPES[type].image;
                console.log(`Loading image for ${type}: ${Pal.TYPES[type].image}`);
            }
        });
    }

    constructor(x, y, type, world, images) {
        this.type = type;
        const { radius } = Pal.TYPES[type];
        
        // Create the Matter.js body
        this.body = Matter.Bodies.circle(x, y, radius, {
            restitution: 0.7,
            friction: 0.05,
            density: 0.002,
            label: type
        });

        // Add the body to the world
        Matter.World.add(world, this.body);

        this.image = images[type];
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
            ctx.fillStyle = Pal.TYPES[this.type].color;
            ctx.fill();
            
            // Reset shadow for image
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Draw Pal image if available
            if (this.image && this.image.complete && this.image.naturalWidth > 0) {
                try {
                    // Create circular clipping path
                    ctx.beginPath();
                    ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
                    ctx.clip();
                    
                    // Calculate size to fill the circle (2x radius for better fit)
                    const size = radius * 2;
                    const x = -radius;
                    const y = -radius;
                    
                    // Draw the image with better quality
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(this.image, x, y, size, size);
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
        Matter.World.remove(world, this.body);
    }
}

// Export for use in game.js
window.Pal = Pal;
