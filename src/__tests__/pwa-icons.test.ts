import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(__dirname, '../..');
const publicDir = path.join(projectRoot, 'public');
const distDir = path.join(projectRoot, 'dist');

/**
 * Lit la taille (width, height) et le colorType d'un PNG depuis son en-tête IHDR.
 */
function readPngHeader(filePath: string): { width: number; height: number; colorType: number } {
  const buf = fs.readFileSync(filePath);
  // Signature PNG : 8 octets (137 80 78 71 13 10 26 10)
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  // IHDR commence à l'octet 12
  const chunkType = buf.toString('ascii', 12, 16);
  expect(chunkType).toBe('IHDR');

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf.readUInt8(25);

  return { width, height, colorType };
}

describe('PWA Icons and Manifest Assets', () => {
  it('public/favicon.svg exists and contains the Lucide Dumbbell icon paths', () => {
    const faviconPath = path.join(publicDir, 'favicon.svg');
    expect(fs.existsSync(faviconPath)).toBe(true);

    const svgContent = fs.readFileSync(faviconPath, 'utf-8');
    // Vérifie la présence du fond noir et des tracés de Dumbbell
    expect(svgContent).toContain('#0A0A0A');
    expect(svgContent).toContain('M17.596 12.768');
    expect(svgContent).toContain('M5.343 21.485');
  });

  it('public/apple-touch-icon.png exists, is 180x180 and is strictly opaque (no alpha channel)', () => {
    // Peut être nommé apple-touch-icon.png ou apple-touch-icon-180x180.png
    const appleIconPath = fs.existsSync(path.join(publicDir, 'apple-touch-icon.png'))
      ? path.join(publicDir, 'apple-touch-icon.png')
      : path.join(publicDir, 'apple-touch-icon-180x180.png');

    expect(fs.existsSync(appleIconPath)).toBe(true);

    const { width, height, colorType } = readPngHeader(appleIconPath);
    expect(width).toBe(180);
    expect(height).toBe(180);

    // Dans la spec PNG :
    // colorType 2 = Truecolor RGB (3 octets/pixel, aucun canal alpha)
    // colorType 0 = Greyscale (aucun canal alpha)
    // Si colorType est 6 (RGBA), le test échoue ou doit prouver l'absence d'alpha
    expect(colorType, 'Apple Touch Icon must be RGB without alpha channel (colorType 2)').toBe(2);
  });

  it('manifest icons exist in public/ with expected dimensions', () => {
    const pwa192 = path.join(publicDir, 'pwa-192x192.png');
    const pwa512 = path.join(publicDir, 'pwa-512x512.png');
    const maskable512 = path.join(publicDir, 'maskable-icon-512x512.png');

    expect(fs.existsSync(pwa192)).toBe(true);
    expect(fs.existsSync(pwa512)).toBe(true);
    expect(fs.existsSync(maskable512)).toBe(true);

    const header192 = readPngHeader(pwa192);
    expect(header192.width).toBe(192);
    expect(header192.height).toBe(192);

    const header512 = readPngHeader(pwa512);
    expect(header512.width).toBe(512);
    expect(header512.height).toBe(512);

    const headerMaskable = readPngHeader(maskable512);
    expect(headerMaskable.width).toBe(512);
    expect(headerMaskable.height).toBe(512);
  });

  it('obsolete template icons are removed from public/', () => {
    const obsoleteIconsSvg = path.join(publicDir, 'icons.svg');
    expect(fs.existsSync(obsoleteIconsSvg)).toBe(false);
  });

  it('index.html links to apple-touch-icon and favicon', () => {
    const indexPath = path.join(projectRoot, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    expect(indexHtml).toContain('rel="apple-touch-icon"');
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain('/favicon.svg');
  });

  it('build output in dist/ contains all icons referenced by the manifest if dist exists', () => {
    if (!fs.existsSync(distDir)) {
      return; // Skip if dist has not been generated yet
    }

    const manifestPath = path.join(distDir, 'manifest.webmanifest');
    if (!fs.existsSync(manifestPath)) {
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(Array.isArray(manifest.icons)).toBe(true);

    for (const icon of manifest.icons) {
      const iconPath = path.join(distDir, icon.src);
      expect(fs.existsSync(iconPath), `Icon ${icon.src} from manifest should exist in dist/`).toBe(true);
    }
  });
});
