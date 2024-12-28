class Smoke {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.particles = [];
        this.lifetime = 500; // Animation duration in ms
        this.startTime = Date.now();
        
        // Create particles
        const numParticles = 12;
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = 1 + Math.random();
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: radius * (0.2 + Math.random() * 0.2),
                opacity: 0.8
            });
        }
    }

    draw(ctx) {
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(elapsed / this.lifetime, 1);
        
        // Update and draw each particle
        this.particles.forEach(particle => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Update size and opacity based on progress
            particle.size *= 1.02;
            particle.opacity = 0.8 * (1 - progress);
            
            // Draw particle
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            ctx.fill();
        });
    }

    isFinished() {
        return Date.now() - this.startTime >= this.lifetime;
    }
}

// Export for use in game.js
window.Smoke = Smoke;
