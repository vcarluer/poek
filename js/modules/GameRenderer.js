export class GameRenderer {
    constructor(canvas, selectionZoneHeight) {
        this.canvas = canvas;
        
        // Configure canvas for optimal rendering
        this.canvas.style.imageRendering = 'high-quality';
        
        // Get context with optimal settings
        this.ctx = canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: true,
            desynchronized: false // Ensure synchronous rendering for better quality
        });
        this.selectionZoneHeight = selectionZoneHeight;
        this.interpolationAlpha = 0;
        
        // Configure context for maximum image quality
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        // Wall styling
        this.wallStyle = {
            fillStyle: '#2c3e50',
            strokeStyle: '#34495e'
        };
    }

    clearCanvas() {
        // Clear canvas with background color
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw selection zone with different color
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.selectionZoneHeight);
        
        // Draw separator line
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.fillRect(0, this.selectionZoneHeight - 2, this.canvas.width, 4);
    }

    drawWalls(walls) {
        walls.forEach(wall => {
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
    }

    drawAimingLine(currentPal) {
        if (!currentPal) return;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.moveTo(currentPal.body.position.x, currentPal.body.position.y);
        this.ctx.lineTo(currentPal.body.position.x, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 1;
    }

    setInterpolationAlpha(alpha) {
        this.interpolationAlpha = alpha;
    }

    interpolatePosition(prev, curr) {
        return {
            x: prev.x + (curr.x - prev.x) * this.interpolationAlpha,
            y: prev.y + (curr.y - prev.y) * this.interpolationAlpha
        };
    }

    drawPals(pals) {
        pals.forEach(pal => {
            const prevPos = pal.body.positionPrev;
            const currPos = pal.body.position;
            const interpolatedPos = this.interpolatePosition(prevPos, currPos);
            
            // Save current position
            const originalPos = { ...pal.body.position };
            
            // Temporarily set position to interpolated position for drawing
            pal.body.position = interpolatedPos;
            pal.draw(this.ctx);
            
            // Restore original position
            pal.body.position = originalPos;
        });
    }

    drawSmokeEffects(smokeEffects) {
        return smokeEffects.filter(smoke => {
            if (!smoke.isFinished()) {
                smoke.draw(this.ctx);
                return true;
            }
            return false;
        });
    }

    takeScreenshot() {
        return this.canvas.toDataURL('image/png');
    }

    reset() {
        // Reset canvas state while maintaining high quality
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.canvas.style.imageRendering = 'high-quality';
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.clearCanvas();
    }

    cleanup() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset canvas state
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Clear references
        this.ctx = null;
    }
}
