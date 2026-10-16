import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function optimizeCharacters() {
  const dir = path.resolve('src/assets/characters');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => 
    !f.startsWith('_temp_') && (f.endsWith('.webp') || f.endsWith('.png'))
  );
  console.log(`Оптимизация персонажей (${files.length} шт.)...`);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const inputBuffer = fs.readFileSync(filePath);
    const originalSize = inputBuffer.length;

    const outputBuffer = await sharp(inputBuffer)
      .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toBuffer();

    fs.writeFileSync(filePath, outputBuffer);

    console.log(`✓ ${file}: ${(originalSize / 1024).toFixed(0)} KB -> ${(outputBuffer.length / 1024).toFixed(0)} KB`);
  }
}

async function optimizeBackground() {
  const posters = ['public/bg-main.png', 'public/splash-bg.png'];

  for (const relPath of posters) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) continue;

    const inputBuffer = fs.readFileSync(fullPath);
    const originalSize = inputBuffer.length;
    console.log(`Оптимизация постера ${path.basename(relPath)}...`);

    const outputBuffer = await sharp(inputBuffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 85, compressionLevel: 9, effort: 7 })
      .toBuffer();

    fs.writeFileSync(fullPath, outputBuffer);
    console.log(`✓ ${path.basename(relPath)}: ${(originalSize / (1024 * 1024)).toFixed(2)} MB -> ${(outputBuffer.length / 1024).toFixed(0)} KB`);
  }
}

async function run() {
  await optimizeCharacters();
  await optimizeBackground();
  console.log('Готово! Все изображения оптимизированы.');
}

run().catch(console.error);