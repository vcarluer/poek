const fs = require('fs');
const https = require('https');
const path = require('path');

const palData = [
    { name: 'lamball', id: 1 },
    { name: 'chikipi', id: 2 },
    { name: 'foxparks', id: 3 },
    { name: 'pengullet', id: 4 },
    { name: 'cattiva', id: 5 },
    { name: 'lifmunk', id: 6 },
    { name: 'fuack', id: 7 },
    { name: 'rooby', id: 8 },
    { name: 'arsox', id: 9 },
    { name: 'jetragon', id: 10 },
    { name: 'mau', id: 11 },
    { name: 'verdash', id: 12 }
];

// Ensure assets directory exists
if (!fs.existsSync('assets')) {
    fs.mkdirSync('assets');
}

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }

            const writeStream = fs.createWriteStream(filepath);
            response.pipe(writeStream);

            writeStream.on('finish', () => {
                writeStream.close();
                resolve();
            });

            writeStream.on('error', reject);
        }).on('error', reject);
    });
}

async function downloadAllImages() {
    for (const pal of palData) {
        const filepath = path.join('assets', `${pal.name}.png`);
        
        console.log(`Checking ${pal.name}...`);
        if (fs.existsSync(filepath)) {
            console.log(`${pal.name} already exists, skipping`);
            continue;
        }
        
        try {
            // Note: This is a placeholder. The actual image generation is handled by generateAIPalImages.js
            console.log(`${pal.name} needs to be generated using generateAIPalImages.js`);
        } catch (error) {
            console.error(`Error processing ${pal.name}:`, error);
        }
    }
}

downloadAllImages().then(() => {
    console.log('All Pal image checks completed!');
}).catch(console.error);
