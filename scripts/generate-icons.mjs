#!/usr/bin/env node
/**
 * Flow — brand asset pipeline.
 * Source of truth: src/assets/brand/logo.svg
 *
 * Generates:
 *   public/favicon.svg                                   — web preview favicon
 *   android/…/res/mipmap-*/ic_launcher.png               — legacy square icon (white bg)
 *   android/…/res/mipmap-*/ic_launcher_round.png         — legacy round icon (white disc)
 *   android/…/res/mipmap-*/ic_launcher_foreground.png    — adaptive foreground (transparent)
 *   android/…/res/mipmap-anydpi-v26/ic_launcher*.xml     — adaptive icon defs (white background)
 *   android/…/res/drawable*/splash.png                   — launch splash (white, centered mark)
 *
 * Safe to re-run at any time; output is deterministic.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO = join(ROOT, 'src/assets/brand/logo.svg');
const RES = join(ROOT, 'android/app/src/main/res');
const PUBLIC_DIR = join(ROOT, 'public');

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Re-rasterize the vector at high density so every output size is crisp. */
async function logo(size) {
  return sharp(LOGO, { density: 384 })
    .resize(size, size, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
}

async function compose({ width, height, background, inner, out }) {
  const mark = await logo(inner);
  await sharp({ create: { width, height, channels: 4, background } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toFile(out);
}

async function roundCompose({ size, inner, out }) {
  const mark = await logo(inner);
  const disc = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#FFFFFF"/></svg>`,
  );
  await sharp(disc).composite([{ input: mark, gravity: 'centre' }]).png().toFile(out);
}

const ADAPTIVE_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

const DENSITIES = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

// [directory, width, height]
const SPLASHES = [
  ['drawable', 320, 480],
  ['drawable-hdpi', 480, 800],
  ['drawable-xhdpi', 720, 1280],
  ['drawable-xxhdpi', 960, 1600],
  ['drawable-xxxhdpi', 1440, 2400],
  ['drawable-land', 480, 320],
  ['drawable-land-hdpi', 800, 480],
  ['drawable-land-xhdpi', 1280, 720],
  ['drawable-land-xxhdpi', 1600, 960],
  ['drawable-land-xxxhdpi', 2400, 1440],
];

async function main() {
  if (!existsSync(LOGO)) fail(`brand source missing: ${LOGO}`);

  mkdirSync(PUBLIC_DIR, { recursive: true });
  copyFileSync(LOGO, join(PUBLIC_DIR, 'favicon.svg'));
  console.log('✓ public/favicon.svg');

  if (!existsSync(RES)) {
    console.log(
      'ℹ android/ not found yet — favicon only. Run after `npx cap add android` for full assets.',
    );
    return;
  }

  for (const [density, scale] of DENSITIES) {
    const dir = join(RES, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });

    // Legacy square launcher — pure white background, mark centered.
    const legacy = Math.round(48 * scale);
    await compose({
      width: legacy,
      height: legacy,
      background: WHITE,
      inner: Math.round(legacy * 0.6),
      out: join(dir, 'ic_launcher.png'),
    });

    // Legacy round launcher — white disc, mark inside the circle.
    await roundCompose({
      size: legacy,
      inner: Math.round(legacy * 0.56),
      out: join(dir, 'ic_launcher_round.png'),
    });

    // Adaptive foreground — transparent 108dp layer, mark within the 66dp safe zone.
    const fg = Math.round(108 * scale);
    await compose({
      width: fg,
      height: fg,
      background: TRANSPARENT,
      inner: Math.round(fg * 0.42),
      out: join(dir, 'ic_launcher_foreground.png'),
    });
  }

  const anydpi = join(RES, 'mipmap-anydpi-v26');
  mkdirSync(anydpi, { recursive: true });
  writeFileSync(join(anydpi, 'ic_launcher.xml'), ADAPTIVE_XML);
  writeFileSync(join(anydpi, 'ic_launcher_round.xml'), ADAPTIVE_XML);

  for (const [dirName, w, h] of SPLASHES) {
    const dir = join(RES, dirName);
    mkdirSync(dir, { recursive: true });
    const inner = Math.round(Math.min(w, h) * 0.34);
    await compose({ width: w, height: h, background: WHITE, inner, out: join(dir, 'splash.png') });
  }

  console.log('✓ Launcher icons (white background), adaptive icons, splash images');
}

main().catch((error) => fail(error.stack ?? String(error)));
