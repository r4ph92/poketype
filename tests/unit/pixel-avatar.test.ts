import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { avatarSeedLimit, isAvatarSeed, pixelAvatarOf } from '@/domain/pixel-avatar';

vi.mock('server-only', () => ({}));

describe('pixel avatar', () => {
  it('draws the same avatar for the same seed', () => {
    expect(pixelAvatarOf(123456789)).toEqual(pixelAvatarOf(123456789));
  });

  it('mirrors every cell across the middle column', () => {
    const { cells } = pixelAvatarOf(987654321);
    const keys = new Set(cells.map(({ column, row }) => `${column},${row}`));
    for (const { column, row } of cells) expect(keys.has(`${6 - column},${row}`)).toBe(true);
  });

  it('accepts only integer seeds inside the range', () => {
    expect([0, avatarSeedLimit - 1].every(isAvatarSeed)).toBe(true);
    expect([-1, avatarSeedLimit, 1.5, '3', null].some(isAvatarSeed)).toBe(false);
  });

  it('gives each of five thousand rooms of five guests five different avatars', async () => {
    const { avatarSeedOf } = await import('@/server/accounts/avatar-seed');
    for (let room = 0; room < 5000; room++) {
      const looks = Array.from({ length: 5 }, () => JSON.stringify(pixelAvatarOf(avatarSeedOf(randomUUID()))));
      expect(new Set(looks).size).toBe(5);
    }
  });

  it('derives the seed from the id alone', async () => {
    const { avatarSeedOf } = await import('@/server/accounts/avatar-seed');
    expect(avatarSeedOf('guest-1')).toBe(avatarSeedOf('guest-1'));
    expect(avatarSeedOf('guest-1')).not.toBe(avatarSeedOf('guest-2'));
  });
});
