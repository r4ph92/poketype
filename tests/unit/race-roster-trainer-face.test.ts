import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RaceRosterRow } from '@/features/race/RaceRosterRow';
import { notStartedProgress, type Racer } from '@/features/race/racers';

const labels = { place: '1.', you: 'Toi', bot: 'Bot · Noob', wpm: '0 MPM' };

function racer(overrides: Partial<Racer>): Racer {
  const base = { memberKey: 'm1', trainerName: 'Maya', avatarSeed: 42, hasAccount: true, isHost: false, isSpectator: false, isViewer: false, bot: null, partner: 'charmander', progress: notStartedProgress, textLength: 40, isFinished: false, isAbandoned: false, isInactive: false };
  return { ...base, ...overrides } as unknown as Racer;
}

function render(row: Racer): string {
  return renderToStaticMarkup(createElement(RaceRosterRow, { racer: row, labels, status: null }));
}

describe('race "Joueurs" frame avatar (story #214)', () => {
  it('shows the account trainer face beside the name, decorative', () => {
    const markup = render(racer({ trainerAvatar: 'leaf' }));
    expect(markup).toContain('data-trainer-face="leaf"');
    expect(markup).toContain('alt=""');
  });

  it('keeps the generated pixel avatar for a guest', () => {
    expect(render(racer({ hasAccount: false, avatarSeed: 7 }))).toContain('data-avatar-seed="7"');
  });

  it('draws no avatar for a bot', () => {
    const markup = render(racer({ memberKey: 'bot-misty', avatarSeed: null, hasAccount: false, bot: { character: 'misty', level: 'noob' } as unknown as Racer['bot'] }));
    expect(markup).not.toContain('data-trainer-face');
    expect(markup).not.toContain('data-avatar-seed');
  });
});
