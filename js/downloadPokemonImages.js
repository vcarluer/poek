const fs = require('fs');
const https = require('https');
const path = require('path');

const pokemonData = [
    { name: 'gyarados', id: 130 },
    { name: 'caterpie', id: 10 },
    { name: 'weedle', id: 13 },
    { name: 'pidgey', id: 16 },
    { name: 'rattata', id: 19 },
    { name: 'pikachu', id: 25 },
    { name: 'charmander', id: 4 },
    { name: 'squirtle', id: 7 },
    { name: 'bulbasaur', id: 1 },
    { name: 'charmeleon', id: 5 },
    { name: 'charizard', id: 6 }
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
    for (const pokemon of pokemonData) {
        const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
        const filepath = path.join('assets', `${pokemon.name}.png`);
        
        console.log(`Downloading ${pokemon.name}...`);
        try {
            await downloadImage(url, filepath);
            console.log(`Downloaded ${pokemon.name} successfully`);
        } catch (error) {
            console.error(`Error downloading ${pokemon.name}:`, error);
        }
    }
}

downloadAllImages().then(() => {
    console.log('All Pokemon images downloaded successfully!');
}).catch(console.error);
