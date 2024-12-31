import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.join(__dirname, '..', '..', 'assets', 'cache');
import { SIZES } from './ImageSizes.js';

class ImageCacheGenerator {
    static async initialize() {
        // Ensure cache directories exist
        const WWW_CACHE_DIR = path.join(__dirname, '..', '..', 'www', 'assets', 'cache');
        [CACHE_DIR, WWW_CACHE_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    static copyToWww(sourcePath) {
        const WWW_CACHE_DIR = path.join(__dirname, '..', '..', 'www', 'assets', 'cache');
        const fileName = path.basename(sourcePath);
        const wwwPath = path.join(WWW_CACHE_DIR, fileName);
        fs.copyFileSync(sourcePath, wwwPath);
    }

    static getCachePath(imageName, size) {
        return path.join(CACHE_DIR, `${imageName}-${size}.png`);
    }

    static async processImage(sourcePath, targetSize) {
        const image = await loadImage(sourcePath);
        
        // Create an intermediate canvas at 2x size for better downscaling
        const intermediateSize = Math.max(targetSize * 2, image.width, image.height);
        const intermediateCanvas = createCanvas(intermediateSize, intermediateSize);
        const intermediateCtx = intermediateCanvas.getContext('2d');
        
        // Enable high-quality image scaling for intermediate step
        intermediateCtx.imageSmoothingEnabled = true;
        intermediateCtx.imageSmoothingQuality = 'high';
        
        // Draw the image at intermediate size first
        intermediateCtx.drawImage(image, 0, 0, intermediateSize, intermediateSize);
        
        // Create final canvas
        const canvas = createCanvas(targetSize, targetSize);
        const ctx = canvas.getContext('2d');
        
        // Enable high-quality image scaling for final step
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
        
        // Clip and draw from intermediate canvas
        ctx.clip();
        ctx.drawImage(intermediateCanvas, 0, 0, targetSize, targetSize);
        
        // Add a subtle border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        return canvas.toBuffer('image/png');
    }

    static async cacheImage(sourcePath) {
        const imageName = path.basename(sourcePath, '.png').toLowerCase();
        console.log(`\nProcessing ${imageName}...`);
        
        // Process and cache standard UI sizes
        const standardSizes = {
            small: SIZES.small,     // 64px for evolution display
            medium: SIZES.medium,   // 128px for small game circles
            large: SIZES.large,     // 256px for preview
            xlarge: SIZES.xlarge    // 512px for game display
        };
        
        // Cache standard sizes
        for (const [sizeName, size] of Object.entries(standardSizes)) {
            const cachePath = this.getCachePath(imageName, sizeName);
            console.log(`Generating ${sizeName} size (${size}px) at ${cachePath}`);
            const buffer = await this.processImage(sourcePath, size);
            fs.writeFileSync(cachePath, buffer);
            this.copyToWww(cachePath);
        }
    }

    static async cacheAllImages() {
        await this.initialize();
        
        const assetsDir = path.resolve(__dirname, '..', '..', 'assets');
        console.log(`Assets directory: ${assetsDir}`);
        const files = fs.readdirSync(assetsDir);
        
        for (const file of files) {
            if (file.endsWith('.png') && !file.includes('-')) {
                const imagePath = path.join(assetsDir, file);
                try {
                    console.log('\n=== Processing file ===');
                    console.log(`File: ${file}`);
                    console.log(`Full path: ${imagePath}`);
                    console.log(`File exists: ${fs.existsSync(imagePath)}`);
                    await this.cacheImage(imagePath);
                    console.log(`Cached all sizes for ${file}`);
                } catch (error) {
                    console.log(`Error caching ${file}: ${error}`);
                }
            }
        }
    }

    static async main() {
        try {
            console.log('Starting image cache generation...');
            console.log(`Cache directory: ${CACHE_DIR}`);
            console.log(`Available sizes: ${JSON.stringify(SIZES, null, 2)}`);
            await this.cacheAllImages();
            console.log('Image cache generation complete!');
        } catch (error) {
            console.log(`Error during image cache generation: ${error}`);
            process.exit(1);
        }
    }
}

// Run the generator if this file is being executed directly
if (process.argv[1] && process.argv[1].endsWith('ImageCacheGenerator.js')) {
    ImageCacheGenerator.main();
}

export { ImageCacheGenerator };
