import { ImageCacheGenerator } from './modules/ImageCacheGenerator.js';

// Process and cache all images at different sizes
ImageCacheGenerator.cacheAllImages().catch(console.error);
