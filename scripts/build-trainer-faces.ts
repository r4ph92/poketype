import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { trainerAvatars } from '../src/assets/trainers';

// Regenerates public/assets/sprites/trainers/faces: the head of each overworld sheet's south frame, with the sheet's transparent palette color made transparent.
const trainerDirectory = join(process.cwd(), 'public/assets/sprites/trainers');
const frame = { left: 1, top: 10, width: 14, height: 14 };

async function buildFace(id: string): Promise<void> {
  const { data, info } = await sharp(join(trainerDirectory, 'overworld', `${id}.png`)).extract(frame).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [red, green, blue] = data;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset] === red && data[offset + 1] === green && data[offset + 2] === blue) data[offset + 3] = 0;
  }
  await sharp(data, { raw: info }).png().toFile(join(trainerDirectory, 'faces', `${id}.png`));
}

mkdirSync(join(trainerDirectory, 'faces'), { recursive: true });
void Promise.all(trainerAvatars.map(buildFace));
