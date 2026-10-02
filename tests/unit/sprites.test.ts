import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pokedex } from '../../src/assets/pokedex';
import { pokemonArtwork } from '../../src/assets/pokemon';
import { racerPortraits } from '../../src/assets/racer-portraits';
import { routeDirection } from '../../src/domain/route-position';

describe('real sprite assets', () => {
  for (const { species } of pokedex) {
    it(`${species} has complete directional sheets with valid source timing`, () => {
      for (const action of ['idle', 'walk'] as const) {
        const sheet = pokemonArtwork[species][action];
        const data = readFileSync(join(process.cwd(), 'public', sheet.src));
        expect(data.readUInt32BE(16)).toBe(sheet.width * sheet.durations.length);
        expect(data.readUInt32BE(20)).toBe(sheet.height * 8);
        expect(sheet.durations.every((duration) => duration > 0)).toBe(true);
      }
    });
  }
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
