// This script creates placeholder circle images for each Pokemon
const fs = require('fs');
const { createCanvas } = require('canvas');

const pokemons = [
    { name: 'caterpie', color: '#A8B820', radius: 20 },
    { name: 'weedle', color: '#A8B820', radius: 25 },
    { name: 'pidgey', color: '#A890F0', radius: 30 },
    { name: 'rattata', color: '#A8A878', radius: 35 },
    { name: 'pikachu', color: '#F8D030', radius: 40 },
    { name: 'charmander', color: '#F08030', radius: 45 },
    { name: 'squirtle', color: '#6890F0', radius: 50 },
    { name: 'bulbasaur', color: '#78C850', radius: 55 },
    { name: 'charmeleon', color: '#F08030', radius: 60 },
    { name: 'charizard', color: '#F08030', radius: 70 }
];

// Ensure assets directory exists
if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
}

pokemons.forEach(pokemon => {
    const canvas = createCanvas(pokemon.radius * 2, pokemon.radius * 2);
    const ctx = canvas.getContext('2d');

    // Draw circle
    ctx.beginPath();
    ctx.arc(pokemon.radius, pokemon.radius, pokemon.radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = pokemon.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add text
    ctx.fillStyle = '#000';
    ctx.font = `${pokemon.radius / 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pokemon.name.slice(0, 2).toUpperCase(), pokemon.radius, pokemon.radius);

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`assets/${pokemon.name}.png`, buffer);
});

console.log('Placeholder images created successfully!');
