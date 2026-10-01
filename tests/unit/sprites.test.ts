import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pokedex } from '../../src/assets/pokedex';
import { pokemonArtwork } from '../../src/assets/pokemon';
import { racerSpecies, starterSpecies } from '../../src/domain/racer-appearance';
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
  it('keeps a racer species stable independent of roster and standings order', () => {
    const keys = ['alex-member', 'zoe-member', 'maya-member'];
    const assignments = new Map(keys.map((key) => [key, racerSpecies(key)]));
    for (const key of keys.reverse()) {
      expect(racerSpecies(key)).toBe(assignments.get(key));
      expect(starterSpecies).toContain(racerSpecies(key));
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
