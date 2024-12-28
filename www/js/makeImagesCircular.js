import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function makeImageCircular(imagePath) {
    try {
        const image = await loadImage(imagePath);
        
        // Create canvas with same dimensions as image
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        // Clear canvas with transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create circular clipping path
        ctx.beginPath();
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw the image
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        // Convert to buffer and save
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
        
        console.log(`Processed ${path.basename(imagePath)}`);
    } catch (error) {
        console.error(`Error processing ${imagePath}:`, error);
    }
}

async function processAllImages() {
    const assetsDir = path.join(__dirname, '..', 'assets');
    const files = fs.readdirSync(assetsDir);
    
    for (const file of files) {
        if (file.endsWith('.png')) {
            const imagePath = path.join(assetsDir, file);
            await makeImageCircular(imagePath);
        }
    }
    console.log('All images processed successfully');
}

processAllImages().catch(console.error);
