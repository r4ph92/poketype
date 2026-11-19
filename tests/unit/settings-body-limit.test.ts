import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { pickableCharacters } from '../../src/domain/character-picks';
import { defaultTextSettings } from '../../src/domain/text-settings';
import { textSettingsRequestSchema } from '../../src/server/validation/room-schemas';

function bodyBytes(body: object): number {
  return Buffer.byteLength(JSON.stringify(body));
}

describe('the settings body limit', () => {
  it('fits the largest body the schema accepts: every offered French character picked, at its UTF-8 size', () => {
    const largest = { ...defaultTextSettings('fr'), kind: 'random', errorMode: 'blocked', wordCount: 150, exclude: [...pickableCharacters.fr] };
    expect(textSettingsRequestSchema.safeParse(largest).success).toBe(true);
    expect(bodyBytes(largest)).toBeLessThanOrEqual(gameConfig.rooms.maxSettingsBodyBytes);
  });

  it('fits a mixed selection that the old 256-byte limit refused', () => {
    const mixed = { ...defaultTextSettings('en'), include: ['a', 'd', 'f', 's'], exclude: [...'bceghijklmnopqrtuvwxyz'] };
    expect(textSettingsRequestSchema.safeParse(mixed).success).toBe(true);
    expect(bodyBytes(mixed)).toBeGreaterThan(256);
    expect(bodyBytes(mixed)).toBeLessThanOrEqual(gameConfig.rooms.maxSettingsBodyBytes);
  });

  it('keeps a ceiling well under a kilobyte', () => {
    expect(gameConfig.rooms.maxSettingsBodyBytes).toBeLessThanOrEqual(1024);
  });
});
