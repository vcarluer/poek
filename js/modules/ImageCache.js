import { Pal } from '../pal.js';

import { SIZES } from './ImageSizes.js';

class ImageCache {
    static getCachePath(imageName, size) {
        return `/assets/cache/${imageName}-${size}.png`;
    }

    static async loadImage(imageName, size) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = (e) => reject(new Error(`Failed to load image ${imageName}-${size}: ${e.message}`));
            image.src = this.getCachePath(imageName, size);
        });
    }

    static async loadImageVariants(imageName, type) {
        try {
            // Load high-resolution images for all uses
            const [evolution, preview, game] = await Promise.all([
                this.loadImage(imageName.toLowerCase(), 'small'),    // 64px for evolution (50px)
                this.loadImage(imageName.toLowerCase(), 'large'),    // 256px for preview (200px)
                this.loadImage(imageName.toLowerCase(), 'xlarge')    // 512px for game display (scaled down as needed)
            ]);

            return {
                evolution,  // Small size for evolution display
                preview,   // Large size for preview
                game      // Exact size for game display
            };
        } catch (error) {
            console.error(`Error loading image variants for ${imageName}:`, error);
            throw error;
        }
    }

    static async loadAllImages(onProgress) {
        const imageVariants = {};
        const totalTypes = Object.keys(Pal.TYPES).length;
        let loadedTypes = 0;
        let errors = [];

        for (const type in Pal.TYPES) {
            const name = Pal.TYPES[type].name;
            try {
                imageVariants[type] = await this.loadImageVariants(name, type);
                loadedTypes++;
                onProgress?.(Math.floor((loadedTypes / totalTypes) * 100));
                console.log(`Loaded cached variants for ${type}`);
            } catch (error) {
                console.error(`Error loading cached variants for ${type}:`, error);
                errors.push({ type, error });
            }
        }

        if (errors.length > 0) {
            throw new Error(`Failed to load images for types: ${errors.map(e => e.type).join(', ')}`);
        }

        return imageVariants;
    }
}

export { ImageCache };
