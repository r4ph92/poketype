import { randomUUID } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PlayerAvatar, avatarPalettes } from '@/components/pixel/PlayerAvatar';
import { gameConfig } from '@/config/game';
import { avatarSeedLimit, isAvatarSeed, pixelAvatarOf } from '@/domain/pixel-avatar';
import type { GuestId } from '@/domain/guest-id';
import type { UserId } from '@/domain/user-id';

vi.mock('server-only', () => ({}));

const { avatarSeedOf, avatarSeedOfSession } = await import('@/server/accounts/avatar-seed');

function render(props: Parameters<typeof PlayerAvatar>[0]): string {
  return renderToStaticMarkup(createElement(PlayerAvatar, props));
}

describe('player avatar', () => {
  it('names the player as an image when no name is shown beside it', () => {
    const markup = render({ seed: 42, name: 'Zoé <b>' });
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Zoé &lt;b&gt;"');
    expect(markup).not.toContain('aria-hidden');
  });

  it('is decorative when the name is beside it', () => {
    const markup = render({ seed: 42 });
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
  });

  it('draws nothing for a bot, which keeps its sprite', () => {
    expect(render({ seed: null, name: 'Pierre' })).toBe('');
  });

  it('reaches every palette and never draws outside the grid', () => {
    const { gridSize, paletteCount } = gameConfig.avatar;
    expect(pixelAvatarOf(avatarSeedLimit - 1).paletteIndex).toBe(paletteCount - 1);
    expect(pixelAvatarOf(0)).toEqual({ cells: [], paletteIndex: 0 });
    for (const { column, row } of pixelAvatarOf(avatarSeedLimit - 1).cells) {
      expect(column).toBeLessThan(gridSize);
      expect(row).toBeLessThan(gridSize);
    }
  });

  it('keeps the guest avatar after the guest signs up', () => {
    const guest = { id: randomUUID() as GuestId, trainerName: 'Zoé' };
    const account = { id: randomUUID() as UserId, username: 'Zoe_1' };
    expect(avatarSeedOfSession({ guest, account: null })).toBe(avatarSeedOf(guest.id));
    expect(avatarSeedOfSession({ guest, account })).toBe(avatarSeedOf(guest.id));
  });

  it('always derives a seed the snapshot parser accepts', () => {
    for (let draw = 0; draw < 2000; draw++) expect(isAvatarSeed(avatarSeedOf(randomUUID()))).toBe(true);
  });

  it('keeps every palette at 3:1 or better in both themes and away from the rank colours', () => {
    const css = readFileSync(join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
    const colorOf = (fill: string, theme: 0 | 1) => {
      const match = new RegExp(`--color-${fill.replace('fill-', '')}:\\s*(?:light-dark\\((#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)|(#[0-9a-f]{6}))`).exec(css)!;
      return match[3] ?? match[theme + 1]!;
    };
    expect(avatarPalettes).toHaveLength(gameConfig.avatar.paletteCount);
    for (const { background, cell } of avatarPalettes) {
      expect([background, cell].join(' ')).not.toMatch(/gold|silver|bronze/);
      for (const theme of [0, 1] as const) expect(contrast(colorOf(background, theme), colorOf(cell, theme))).toBeGreaterThanOrEqual(3);
    }
  });
});

function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

function contrast(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}
