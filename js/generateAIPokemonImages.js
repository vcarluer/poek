import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '..', 'config', 'imageGeneration.json');
let config;
try {
    const configData = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
} catch (error) {
    console.error('Error loading configuration:', error);
    process.exit(1);
}

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const palData = [
    { 
        name: 'lamball', 
        prompt: 'A cute sheep-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. A fluffy white Lamball with wool-like texture. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'chikipi',
        prompt: 'A bird-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. A yellow Chikipi with small wing details. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'foxparks',
        prompt: 'A fox-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. An orange Foxparks with flame patterns. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'pengullet',
        prompt: 'A penguin-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. A blue Pengullet with ice crystal patterns. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'cattiva',
        prompt: 'A cat-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. A purple Cattiva with mischievous expression. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'lifmunk',
        prompt: 'A squirrel-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. A green Lifmunk with leaf patterns. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'fuack',
        prompt: 'A duck-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. A blue Fuack with water droplet patterns. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'rooby',
        prompt: 'A kangaroo-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. A red Rooby with flame patterns. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'arsox',
        prompt: 'A fox-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. An orange Arsox with flame patterns on its tail. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    },
    { 
        name: 'jetragon',
        prompt: 'A dragon-like creature from Palworld in anime art style, centered perfectly inside a solid white circular frame with sharp edges. A blue Jetragon with energy patterns on its wings. Must be in Palworld art style. Clean cel shading, simple lines, official game artwork, completely transparent background outside the white circle'
    }
];

// Ensure required directories exist
const assetsDir = path.join(__dirname, '..', 'assets');
const backupDir = path.join(__dirname, '..', config.backupDirectory);

[assetsDir, backupDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

async function backupImage(filePath, palName) {
    if (!fs.existsSync(filePath)) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${palName}-${timestamp}.png`);
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup created at: ${backupPath}`);
}

async function generateAndSaveImage(pal) {
    try {
        const imagePath = path.join(assetsDir, `${pal.name}.png`);
        const palConfig = config.pals[pal.name] || { forceRegenerate: false };

        // Check if image already exists and force flag is not set
        if (fs.existsSync(imagePath) && !palConfig.forceRegenerate) {
            console.log(`Skipping ${pal.name} - image already exists and force regenerate is not set`);
            return;
        }

        console.log(`Generating image for ${pal.name}...`);
        
        // Backup existing image if it exists
        if (fs.existsSync(imagePath)) {
            await backupImage(imagePath, pal.name);
        }
        
        const output = await replicate.run(
            "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
            {
                input: {
                    prompt: pal.prompt + ", masterpiece quality, official Palworld artwork, perfect circular composition",
                    negative_prompt: "different proportions, different anatomy, different design, extra limbs, missing features, wrong colors, detailed background, deformed, ugly, blurry, bad art, bad anatomy, bad proportions, extra digits, fewer digits, cropped, worst quality, low quality, multiple views, grid, 3d render, photograph, realistic, nsfw, suggestive, rectangular frame, square frame",
                    width: 768,
                    height: 768,
                    num_inference_steps: 50,
                    guidance_scale: 12,
                    refine: "expert_ensemble_refiner",
                    high_noise_frac: 0.8,
                    refine_steps: 25
                }
            }
        );

        // Download the image
        const imageUrl = output[0];
        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Save the image
        fs.writeFileSync(imagePath, buffer);
        
        console.log(`Successfully generated and saved image for ${pal.name}`);
        
        // Reset force flag after successful generation
        if (palConfig.forceRegenerate) {
            config.pals[pal.name].forceRegenerate = false;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
    } catch (error) {
        console.error(`Error generating image for ${pal.name}:`, error);
    }
}

async function generateAllImages() {
    for (const pal of palData) {
        await generateAndSaveImage(pal);
        // Add a delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

generateAllImages().then(() => {
    console.log('All Pal images generated successfully!');
}).catch(console.error);
