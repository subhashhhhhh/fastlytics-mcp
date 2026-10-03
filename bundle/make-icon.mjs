/**
 * Generate the MCPB bundle icon from the Fastlytics brand mark.
 *
 * The source asset (public/brand/icon-dark-high-res.png) is 708x444 with an
 * alpha channel. MCPB clients render the icon in a square slot, so a
 * non-square source gets letterboxed or distorted. Pad it to a square on a
 * fully transparent canvas rather than a coloured one, so the same file reads
 * correctly on both light and dark backgrounds.
 *
 * Outputs 512x512 (the size Claude Desktop shows) and 128x128 (small UI slots).
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = '/home/ubuntu/Fastlytics/public/brand/icon-dark-high-res.png';
// Anchor output to the package root, not the cwd, so this can be run from
// anywhere (including a temp dir where a tool like sharp is installed).
const OUT_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  'assets',
);

const sizes = [
  { size: 512, name: 'icon.png' },
  { size: 128, name: 'icon-128.png' },
];

const meta = await sharp(SRC).metadata();
const content = Math.min(meta.width, meta.height);
const side = Math.max(meta.width, meta.height);

// Centre the mark inside a transparent square.
const left = Math.round((side - content) / 2);
const top = Math.round((side - content) / 2);

await mkdir(OUT_DIR, { recursive: true });

for (const { size, name } of sizes) {
  await sharp(SRC)
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, name));

  const out = await sharp(path.join(OUT_DIR, name)).metadata();
  console.log(`  ${name}: ${out.width}x${out.height} alpha=${out.hasAlpha}`);
}

console.log(`  source ${meta.width}x${meta.height}, padded to ${side}x${side} transparent square`);
