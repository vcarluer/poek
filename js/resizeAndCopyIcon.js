import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

async function resizeAndCopy() {
    const sourceImage = path.join(__dirname, '..', 'assets', 'jetragon.png');
    
    for (const [density, size] of Object.entries(sizes)) {
        const targetDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`);
        const targetPath = path.join(targetDir, 'ic_launcher.png');
        const targetRoundPath = path.join(targetDir, 'ic_launcher_round.png');
        const targetForegroundPath = path.join(targetDir, 'ic_launcher_foreground.png');

        await sharp(sourceImage)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toFile(targetPath);

        // Copy the same image for round icons
        await sharp(sourceImage)
            .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toFile(targetRoundPath);

        // For foreground, make it slightly smaller (70% of the full size)
        const foregroundSize = Math.floor(size * 0.7);
        await sharp(sourceImage)
            .resize(foregroundSize, foregroundSize, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .toFile(targetForegroundPath);
    }
}

resizeAndCopy().catch(console.error);
