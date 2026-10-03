import { directionRowOf } from '../../src/components/pixel/sprite-sheet';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pokedex } from '../../src/assets/pokedex';
import { existsSync } from 'node:fs';
import { pokemonCredits } from '../../src/assets/pokemon-credits';
import { racerPortraits } from '../../src/assets/racer-portraits';
import { frameAnimationName, frameKeyframes, spriteSheetOf } from '../../src/components/pixel/sprite-sheet';
import { routeDirection } from '../../src/domain/route-position';

function publicFile(path: string): string {
  return join(process.cwd(), 'public', path);
}

describe('real sprite assets', () => {
  it('covers the 649 species of Kanto to Unova', () => {
    expect(pokedex).toHaveLength(649);
    expect(pokedex.map((entry) => entry.dex)).toEqual(Array.from({ length: 649 }, (_, index) => index + 1));
  });

  for (const { species, dex } of pokedex) {
    it(`${species} has front artwork, credits and either complete directional sheets or a marked still sprite`, () => {
      const credit = pokemonCredits[species];
      expect(existsSync(publicFile(`/assets/sprites/pokemon/front/${dex}.png`))).toBe(true);
      expect(credit.dex).toBe(dex);
      expect(credit.credit.length).toBeGreaterThan(0);
      if (credit.animation === 'still') {
        expect(spriteSheetOf(species, 'idle')).toBeNull();
        return;
      }
      expect(existsSync(publicFile(credit.creditsPath))).toBe(true);
      for (const action of ['idle', 'walk'] as const) {
        const sheet = spriteSheetOf(species, action)!;
        const data = readFileSync(publicFile(sheet.src));
        expect(data.readUInt32BE(16)).toBe(sheet.sheetWidth);
        expect(data.readUInt32BE(20)).toBe(sheet.sheetHeight);
        expect(sheet.durations.every((duration) => duration > 0)).toBe(true);
      }
    });
  }

  it('builds one shared keyframe animation per frame timing', () => {
    expect(frameAnimationName([40, 6, 6])).toBe('sprite-frames-40-6-6');
    expect(frameKeyframes([2, 2])).toBe('@keyframes sprite-frames-2-2{0.000000%{transform:translateX(calc(var(--sprite-frame-width) * -0))}50.000000%{transform:translateX(calc(var(--sprite-frame-width) * -1))}100%{transform:translateX(0)}}');
  });
  it('has a podium crop inside every 96×96 front sprite', () => {
    for (const { species, dex } of pokedex) {
      const { x, y, width, height, dex: portraitDex } = racerPortraits[species];
      expect(portraitDex).toBe(dex);
      expect(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 96 && y + height <= 96).toBe(true);
    }
  });
  it('faces the direction of each section of the winding path', () => {
    expect(routeDirection(0)).toBe('east');
    expect(routeDirection(150 / 940)).toBe('north');
    expect(routeDirection(350 / 940)).toBe('south');
    expect(routeDirection(535 / 940)).toBe('east');
    expect(routeDirection(1)).toBe('north');
  });
});

describe('sprite sheet directions', () => {
  it('maps each facing to the PMD row order (down, down-right, right, up-right, up, up-left, left, down-left)', () => {
    expect(directionRowOf).toEqual({ south: 0, southeast: 1, east: 2, northeast: 3, north: 4, northwest: 5, west: 6, southwest: 7 });
  });
});
