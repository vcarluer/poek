import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '..', '..', 'assets', 'cache');
const SIZES = {
    small: 64,    // For UI elements
    medium: 128,  // For game circles
    large: 256,   // For evolution display
    xlarge: 512   // For high-res displays
};

class ImageCache {
    static async initialize() {
        // Ensure cache directory exists
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
    }

    static getCachePath(imageName, size) {
        return path.join(CACHE_DIR, `${imageName}-${size}.png`);
    }

    static async processImage(sourcePath, targetSize) {
        const image = await loadImage(sourcePath);
        
        // Create canvas with target dimensions
        const canvas = createCanvas(targetSize, targetSize);
        const ctx = canvas.getContext('2d');
        
        // Enable high-quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Clear canvas
        ctx.clearRect(0, 0, targetSize, targetSize);
        
        // Create circular clipping path with anti-aliasing
        ctx.beginPath();
        const centerX = targetSize / 2;
        const centerY = targetSize / 2;
        const radius = (targetSize / 2) - 1; // Slight reduction to prevent edge artifacts
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        
        // Add a subtle shadow for depth
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        
        // Clip and draw
        ctx.clip();
        ctx.drawImage(image, 0, 0, targetSize, targetSize);
        
        // Add a subtle border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        return canvas.toBuffer('image/png');
    }

    static async cacheImage(sourcePath) {
        const imageName = path.basename(sourcePath, '.png');
        
        // Process and cache each size
        for (const [sizeName, size] of Object.entries(SIZES)) {
            const cachePath = this.getCachePath(imageName, sizeName);
            const buffer = await this.processImage(sourcePath, size);
            fs.writeFileSync(cachePath, buffer);
        }
    }

    static async cacheAllImages() {
        await this.initialize();
        
        const assetsDir = path.join(__dirname, '..', '..', 'assets');
        const files = fs.readdirSync(assetsDir);
        
        for (const file of files) {
            if (file.endsWith('.png') && !file.includes('-')) {
                const imagePath = path.join(assetsDir, file);
                await this.cacheImage(imagePath);
                console.log(`Cached all sizes for ${file}`);
            }
        }
    }

    static getImagePath(imageName, size = 'medium') {
        const cachePath = this.getCachePath(imageName, size);
        if (fs.existsSync(cachePath)) {
            return cachePath;
        }
        // Fallback to original if cached version doesn't exist
        return path.join(__dirname, '..', '..', 'assets', `${imageName}.png`);
    }
}

// Export both the class and sizes constant
export { ImageCache, SIZES };
