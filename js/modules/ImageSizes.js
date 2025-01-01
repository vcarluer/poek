// Fonction pour calculer la taille d'un pal en fonction de son index
function calculatePalSize(index, maxSize) {
    // Définition des limites
    const MIN_SIZE = 20; // Retour à la taille minimale de 20
    const EFFECTIVE_MAX = maxSize * 0.45; // Réduit à 45% de la largeur max
    
    // Utilisation d'une progression quadratique pour une croissance plus douce
    const progress = Math.pow(index / 11, 0.8); // Exposant < 1 pour ralentir la croissance
    const size_range = EFFECTIVE_MAX - MIN_SIZE;
    
    // Calcul de la taille avec la progression quadratique
    return Math.round(MIN_SIZE + (size_range * progress));
}

// Calcul des tailles en fonction de la largeur du jeu (393px)
const GAME_WIDTH = 393;
const MAX_SIZE = GAME_WIDTH * 0.7; // 70% de la largeur du jeu

export const SIZES = {
    // Image sizes for different display contexts
    small: 64,    // For evolution display (50px)
    medium: 128,  // For small game circles
    large: 256,   // For preview (200px)
    xlarge: 512,  // For game display (all Pals)

    // Physics sizes for each Pal type (diameter = radius * 2)
    // These values are used for collision detection and physics calculations
    // Progression exponentielle dynamique
    lamball: calculatePalSize(0, MAX_SIZE),      // Premier pal
    chikipi: calculatePalSize(1, MAX_SIZE),
    foxparks: calculatePalSize(2, MAX_SIZE),
    pengullet: calculatePalSize(3, MAX_SIZE),
    cattiva: calculatePalSize(4, MAX_SIZE),
    lifmunk: calculatePalSize(5, MAX_SIZE),
    fuack: calculatePalSize(6, MAX_SIZE),
    rooby: calculatePalSize(7, MAX_SIZE),
    arsox: calculatePalSize(8, MAX_SIZE),
    mau: calculatePalSize(9, MAX_SIZE),
    verdash: calculatePalSize(10, MAX_SIZE),
    jetragon: calculatePalSize(11, MAX_SIZE)     // Dernier pal
};
