import { ImageCache } from './modules/ImageCache.js';

// Process and cache all images at different sizes
ImageCache.cacheAllImages().catch(console.error);
