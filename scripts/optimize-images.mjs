import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function optimizeIcons() {
  console.log('--- Оптимизация иконок PWA ---');
  const faviconPath = path.resolve('public/favicon.png');
  if (fs.existsSync(faviconPath)) {
    const input = fs.readFileSync(faviconPath);
    const before = input.length;
    const output = await sharp(input)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, effort: 8 })
      .toBuffer();
    fs.writeFileSync(faviconPath, output);
    console.log(`✓ favicon.png (192x192): ${(before / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB`);
  }

  const touchIconPath = path.resolve('public/apple-touch-icon.png');
  if (fs.existsSync(touchIconPath)) {
    const input = fs.readFileSync(touchIconPath);
    const before = input.length;
    const output = await sharp(input)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, effort: 8 })
      .toBuffer();
    fs.writeFileSync(touchIconPath, output);
    console.log(`✓ apple-touch-icon.png (512x512): ${(before / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB`);
  }
}

async function optimizePosters() {
  console.log('--- Оптимизация фоновых постеров ---');
  const posters = [
    { file: 'public/splash-bg-PC.png', width: 1920, height: 1080 },
    { file: 'public/splash-bg.png', width: 1080, height: 1920 },
    { file: 'public/bg-main.png', width: 1920, height: 1080 },
    { file: 'src/assets/lobby_background.png', width: 1920, height: 1080 },
    { file: 'src/assets/modes/maniac_preview.png', width: 1200, height: 600 },
  ];

  for (const item of posters) {
    const fullPath = path.resolve(item.file);
    if (!fs.existsSync(fullPath)) continue;

    const input = fs.readFileSync(fullPath);
    const before = input.length;

    const output = await sharp(input)
      .resize(item.width, item.height, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, effort: 7, palette: true, quality: 85 })
      .toBuffer();

    fs.writeFileSync(fullPath, output);
    console.log(`✓ ${path.basename(item.file)}: ${(before / 1024).toFixed(0)} KB -> ${(output.length / 1024).toFixed(0)} KB`);
  }
}

async function removeDeadAssets() {
  console.log('--- Очистка неиспользуемых ассетов ---');
  const deadAsset = path.resolve('src/assets/modes/skhvatka_preview.png');
  if (fs.existsSync(deadAsset)) {
    const size = fs.statSync(deadAsset).size;
    fs.unlinkSync(deadAsset);
    console.log(`✓ Удалён мёртвый ассет skhvatka_preview.png: освобождено ${(size / (1024 * 1024)).toFixed(2)} MB`);
  }
}

async function optimizeCharacters() {
  const dir = path.resolve('src/assets/characters');
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(f => 
    !f.startsWith('_temp_') && f.endsWith('.webp')
  );
  console.log(`--- Проверка портретов персонажей (${files.length} шт.) ---`);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const input = fs.readFileSync(filePath);
    totalBefore += input.length;

    // Портреты уже хорошо сжаты, убеждаемся что размер 512x512
    const output = await sharp(input)
      .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();

    totalAfter += output.length;
    if (output.length < input.length) {
      fs.writeFileSync(filePath, output);
    }
  }

  console.log(`✓ Портреты: ${(totalBefore / 1024).toFixed(0)} KB -> ${(totalAfter / 1024).toFixed(0)} KB`);
}

async function main() {
  await removeDeadAssets();
  await optimizeIcons();
  await optimizePosters();
  await optimizeCharacters();
  console.log('🎉 Оптимизация ресурсов завершена успешно!');
}

main().catch(console.error);
