import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import fr from '../../messages/fr.json';
import { RaceWpmTable } from '../../src/features/race/wpm-timeline/RaceWpmTable';
import type { WpmLine } from '../../src/features/race/wpm-timeline/wpm-lines';

const lines: WpmLine[] = [
  { memberKey: 'zoe', trainerName: 'Zoé', isViewer: true, isBot: false, style: { color: 'xp', dash: null }, points: [{ elapsedMs: 1_000, wpm: 60 }, { elapsedMs: 1_400, wpm: 64 }] },
  { memberKey: 'leo', trainerName: 'Léo', isViewer: false, isBot: false, style: { color: 'ink', dash: '12 6' }, points: [{ elapsedMs: 1_000, wpm: 30 }, { elapsedMs: 2_000, wpm: 36 }] },
];

function render(): string {
  const table = createElement(RaceWpmTable, { lines });
  return renderToStaticMarkup(createElement(NextIntlClientProvider, { locale: 'fr', messages: { Room: fr.Room }, timeZone: 'America/Toronto' } as ComponentProps<typeof NextIntlClientProvider>, table));
}

describe('RaceWpmTable', () => {
  it('scrolls sideways in a focusable region named by its caption, so the keyboard can reach every column', () => {
    const markup = render();
    const region = /<div([^>]*)>\s*<table/.exec(markup)?.[1] ?? '';
    expect(region).toContain('role="region"');
    expect(region).toContain('tabindex="0"');
    const labelledBy = /aria-labelledby="([^"]+)"/.exec(region)?.[1];
    expect(markup).toContain(`<caption id="${labelledBy}"`);
    expect(markup).toContain(fr.Room.wpmTimelineCaption);
  });
});
