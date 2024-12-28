// This script creates placeholder circle images for each Pal
const fs = require('fs');
const { createCanvas } = require('canvas');

const pals = [
    { name: 'lamball', color: '#F8E8E8', radius: 20 },
    { name: 'chikipi', color: '#FFE5B4', radius: 25 },
    { name: 'foxparks', color: '#FF7F50', radius: 30 },
    { name: 'pengullet', color: '#87CEEB', radius: 35 },
    { name: 'cattiva', color: '#DDA0DD', radius: 40 },
    { name: 'lifmunk', color: '#90EE90', radius: 45 },
    { name: 'fuack', color: '#4682B4', radius: 50 },
    { name: 'rooby', color: '#CD5C5C', radius: 55 },
    { name: 'arsox', color: '#FF4500', radius: 60 },
    { name: 'jetragon', color: '#4169E1', radius: 70 },
    { name: 'mau', color: '#000000', radius: 65 },
    { name: 'verdash', color: '#228B22', radius: 75 }
];

// Ensure assets directory exists
if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
}

pals.forEach(pal => {
    const canvas = createCanvas(pal.radius * 2, pal.radius * 2);
    const ctx = canvas.getContext('2d');

    // Draw circle
    ctx.beginPath();
    ctx.arc(pal.radius, pal.radius, pal.radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = pal.color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add text
    ctx.fillStyle = '#000';
    ctx.font = `${pal.radius / 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pal.name.slice(0, 2).toUpperCase(), pal.radius, pal.radius);

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`assets/${pal.name}.png`, buffer);
});

console.log('Placeholder images created successfully!');
