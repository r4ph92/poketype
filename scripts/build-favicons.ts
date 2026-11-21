import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// Regenerates the icons made from the pixel Poké Ball logo: icon.svg for modern browsers, favicon.ico for /favicon.ico requests, apple-icon.png for home screens, and a 512px copy for the creative-process doc.
const source = join(process.cwd(), 'public/assets/items/poke-ball.svg');
const appDirectory = join(process.cwd(), 'src/app');
const appleIconSize = 180;
const appleIconBallSize = 128;
const creamPaper = '#f6f0d8';
const docLogoSize = 512;
const docLogoPath = join(process.cwd(), 'docs/design/demarche/logo-pokeball.png');

async function pixelPng(size: number): Promise<Buffer> {
  const native = await sharp(source).resize(32, 32).png().toBuffer();
  return sharp(native).resize(size, size, { kernel: 'nearest' }).png().toBuffer();
}

// An ICO file may carry a PNG image as is: a 6-byte header, one 16-byte directory entry, then the PNG.
function icoWrapping(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}

async function buildAppleIcon(): Promise<void> {
  const ball = await pixelPng(appleIconBallSize);
  const offset = (appleIconSize - appleIconBallSize) / 2;
  await sharp({ create: { width: appleIconSize, height: appleIconSize, channels: 4, background: creamPaper } })
    .composite([{ input: ball, left: offset, top: offset }])
    .png()
    .toFile(join(appDirectory, 'apple-icon.png'));
}

async function buildIcons(): Promise<void> {
  copyFileSync(source, join(appDirectory, 'icon.svg'));
  writeFileSync(join(appDirectory, 'favicon.ico'), icoWrapping(await pixelPng(32), 32));
  await buildAppleIcon();
  writeFileSync(docLogoPath, await pixelPng(docLogoSize));
}

void buildIcons();
