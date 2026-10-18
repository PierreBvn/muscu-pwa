import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const designSvg = path.join(rootDir, 'design', 'app-icon.svg');
const publicFaviconSvg = path.join(publicDir, 'favicon.svg');

console.log('1. Copie de design/app-icon.svg vers public/favicon.svg...');
if (!fs.existsSync(designSvg)) {
  console.error(`Erreur : ${designSvg} introuvable !`);
  process.exit(1);
}
fs.copyFileSync(designSvg, publicFaviconSvg);

// Suppression des icônes obsolètes
const obsoleteIconsSvg = path.join(publicDir, 'icons.svg');
if (fs.existsSync(obsoleteIconsSvg)) {
  console.log('2. Suppression de public/icons.svg obsolète...');
  fs.unlinkSync(obsoleteIconsSvg);
}

console.log('3. Exécution de pwa-assets-generator...');
execSync('npx pwa-assets-generator', {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

// Synchronisation de apple-touch-icon.png si apple-touch-icon-180x180.png a été généré
const apple180 = path.join(publicDir, 'apple-touch-icon-180x180.png');
const appleDefault = path.join(publicDir, 'apple-touch-icon.png');

if (fs.existsSync(apple180)) {
  fs.copyFileSync(apple180, appleDefault);
  console.log('4. Synchronisation de apple-touch-icon.png depuis apple-touch-icon-180x180.png.');
}

console.log('5. Vérification de l\'absence de canal alpha sur apple-touch-icon...');
// Si l'icône a été générée en RGBA (colorType 6) plutôt qu'en RGB (colorType 2),
// nous utilisons sharp (déjà installé comme sous-dépendance de @vite-pwa/assets-generator)
// pour garantir un PNG sans canal alpha (colorType 2, RGB direct sans transparence).
async function ensureOpaqueRgb(pngPath) {
  const buf = fs.readFileSync(pngPath);
  const colorType = buf.readUInt8(25);
  if (colorType !== 2) {
    console.log(`Conversion de ${path.basename(pngPath)} en PNG Truecolor RGB (type 2, sans canal alpha)...`);
    const { default: sharp } = await import('sharp');
    const rgbBuffer = await sharp(pngPath)
      .flatten({ background: '#0A0A0A' })
      .removeAlpha()
      .png({ palette: false, force: true })
      .toBuffer();
    fs.writeFileSync(pngPath, rgbBuffer);
  }
}

await ensureOpaqueRgb(appleDefault);
if (fs.existsSync(apple180)) {
  await ensureOpaqueRgb(apple180);
}

console.log('✓ Génération des icônes terminée avec succès.');
