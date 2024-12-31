import { Pal } from '../pal.js';

const SIZES = {
    small: 64,    // For evolution display (50px)
    medium: 128,  // For small game circles
    large: 256,   // For preview (200px) and medium game circles
    xlarge: 512   // For large game circles
};

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

    static getAppropriateGameSize(type) {
        const radius = Pal.TYPES[type].radius;
        if (radius <= 64) return 'medium';      // Pour les petits Pals
        if (radius <= 128) return 'large';      // Pour les Pals moyens
        return 'xlarge';                        // Pour les grands Pals
    }

    static async loadImageVariants(imageName, type) {
        try {
            const gameSize = this.getAppropriateGameSize(type);
            const [evolution, preview, game] = await Promise.all([
                this.loadImage(imageName, 'small'),     // 64px pour evolution (50px)
                this.loadImage(imageName, 'large'),     // 256px pour preview (200px)
                this.loadImage(imageName, gameSize)     // Taille adaptée au radius
            ]);

            return {
                evolution,  // Petite taille pour l'affichage des évolutions
                preview,   // Grande taille pour la preview
                game      // Taille adaptée au radius du Pal
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

export { ImageCache, SIZES };
