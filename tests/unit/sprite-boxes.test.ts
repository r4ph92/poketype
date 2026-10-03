import { describe, expect, it } from 'vitest';
import { pokemonSprites, type PokemonSpecies } from '@/assets/pokemon';
import { spriteBoxes } from '@/components/pixel/sprite-boxes';
import { largestFrameOf, scaleToFit } from '@/components/pixel/sprite-sheet';

const species = Object.keys(pokemonSprites) as PokemonSpecies[];

describe('sprite boxes', () => {
  it.each(Object.entries(spriteBoxes))('%s holds every species at scale 1', (_name, box) => {
    for (const name of species) {
      const frame = largestFrameOf(name);
      expect(frame.width, name).toBeLessThanOrEqual(box.width);
      expect(frame.height, name).toBeLessThanOrEqual(box.height);
    }
  });

  it('draws small species larger than giants, never above the box maximum', () => {
    const box = spriteBoxes.lobbyCard;
    expect(scaleToFit(largestFrameOf('caterpie'), box)).toBeGreaterThanOrEqual(2);
    expect(scaleToFit(largestFrameOf('kyurem'), box)).toBe(1);
    expect(scaleToFit(largestFrameOf('gyarados'), box)).toBe(1);
    expect(scaleToFit({ width: 8, height: 8 }, spriteBoxes.resultsRow)).toBe(2);
  });
});
