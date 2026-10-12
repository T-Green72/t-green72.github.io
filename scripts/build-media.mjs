// Builds web-ready images and copies fonts into site/assets.
// Run: npm run media   (originals live in media-source/)
import sharp from 'sharp';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';

const SRC = 'media-source';
const IMG = 'site/assets/img';
const FONTS = 'site/assets/fonts';
await mkdir(IMG, { recursive: true });
await mkdir(FONTS, { recursive: true });

// Documentary photos: name in site -> source file
const photos = {
  'steklotekh-teams': '2026-steklotekh-briefing.jpg',
  'steklotekh-hall': '2026-steklotekh-hall-lineup.jpg',
  'steklotekh-stations': '2026-steklotekh-game-stations.jpg',
  'steklotekh-stage': '2026-steklotekh-stage.jpg',
};
for (const [name, file] of Object.entries(photos)) {
  for (const w of [480, 800, 1200]) {
    await sharp(`${SRC}/${file}`).rotate().resize({ width: w, withoutEnlargement: true })
      .webp({ quality: w > 800 ? 72 : 78 }).toFile(`${IMG}/${name}-${w}.webp`);
  }
  await sharp(`${SRC}/${file}`).rotate().resize({ width: 800 }).jpeg({ quality: 80, mozjpeg: true })
    .toFile(`${IMG}/${name}-800.jpg`);
}

// Video posters
for (const [name, file] of Object.entries({ 'poster-squirrel': 'poster-squirrel.jpg', 'poster-hoop': 'poster-hoop.jpg' })) {
  await sharp(`${SRC}/${file}`).resize({ width: 576 }).webp({ quality: 80 }).toFile(`${IMG}/${name}.webp`);
  await sharp(`${SRC}/${file}`).resize({ width: 576 }).jpeg({ quality: 82, mozjpeg: true }).toFile(`${IMG}/${name}.jpg`);
}

// Logo: used exactly as supplied, only resized
const logo = `${SRC}/tgreen-logo.webp`;
for (const w of [96, 320, 640, 960]) {
  await sharp(logo).resize({ width: w }).webp({ quality: 90 }).toFile(`${IMG}/logo-${w}.webp`);
}
await sharp(logo).resize({ width: 640 }).png({ compressionLevel: 9 }).toFile(`${IMG}/logo-640.png`);
await sharp(logo).resize({ width: 32 }).png().toFile('site/favicon-32.png');
await sharp(logo).resize({ width: 180 }).png().toFile('site/apple-touch-icon.png');
// Link-preview image: logo on its own cream background, 1200x630
const logoBuf = await sharp(logo).resize({ width: 600 }).toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#FEFAE9' } })
  .composite([{ input: logoBuf, top: 15, left: 300 }]).jpeg({ quality: 86 }).toFile(`${IMG}/og-image.jpg`);

// Fonts (OFL-1.1): Cyrillic + Latin variable subsets
const fonts = [
  ['rubik', 'rubik-cyrillic-wght-normal.woff2'], ['rubik', 'rubik-latin-wght-normal.woff2'],
  ['golos-text', 'golos-text-cyrillic-wght-normal.woff2'], ['golos-text', 'golos-text-latin-wght-normal.woff2'],
  ['caveat', 'caveat-cyrillic-wght-normal.woff2'], ['caveat', 'caveat-latin-wght-normal.woff2'],
];
for (const [pkg, file] of fonts) {
  await copyFile(`node_modules/@fontsource-variable/${pkg}/files/${file}`, `${FONTS}/${file}`);
}
await writeFile(`${FONTS}/LICENSE.txt`,
  'Rubik, Golos Text and Caveat are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org).\n' +
  'Files from the Fontsource project (https://fontsource.org).\n');
console.log('media built');
