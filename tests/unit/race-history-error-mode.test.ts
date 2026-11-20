import { createElement, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createFormatter, createTranslator, NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import type { RaceHistoryEntry } from '../../src/domain/race-history';
import { RaceHistoryTable } from '../../src/features/history/RaceHistoryTable';
import { RaceHistoryView } from '../../src/features/history/RaceHistoryView';

type Locale = 'fr' | 'en';

const catalogs = { fr, en } as const;
const timeZone = 'UTC';
let currentLocale: Locale = 'fr';

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => createTranslator({ locale: currentLocale, messages: catalogs[currentLocale], namespace: namespace as never }),
  getFormatter: async () => createFormatter({ locale: currentLocale, timeZone }),
}));

const settled: RaceHistoryEntry = { raceId: 'race-free', roomId: 'room', endedAt: new Date('2026-11-20T15:20:00Z'), place: 1, participantCount: 2, isAbandoned: false, isInactive: false, grossWpm: 41, accuracy: 0.98, textLanguage: 'fr', errorMode: 'free' };
const entries: RaceHistoryEntry[] = [
  settled,
  { ...settled, raceId: 'race-blocked', errorMode: 'blocked', textLanguage: 'en' },
  { ...settled, raceId: 'race-abandoned', errorMode: 'free', isAbandoned: true, place: null, grossWpm: null, accuracy: null },
];

// Async server components cannot go through renderToStaticMarkup, so they are awaited first; client components stay elements.
async function resolve(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolve));
  if (!isValidElement(node)) return node;
  const { type, props } = node as { type: unknown; props: { children?: ReactNode } };
  if (typeof type === 'function' && type.constructor.name === 'AsyncFunction') return resolve(await (type as (input: unknown) => Promise<ReactNode>)(props));
  if (props.children === undefined) return node;
  return { ...node, props: { ...props, children: await resolve(props.children) } } as ReactNode;
}

async function render(element: ReactNode): Promise<string> {
  const tree = await resolve(element);
  const provider = { locale: currentLocale, messages: catalogs[currentLocale], timeZone } as ComponentProps<typeof NextIntlClientProvider>;
  return renderToStaticMarkup(createElement(NextIntlClientProvider, provider, tree));
}

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function headers(html: string): string[] {
  const head = /<thead>([\s\S]*?)<\/thead>/.exec(html)![1]!;
  return [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((match) => plainText(match[1]!));
}

function lastCellOfRows(html: string): string[] {
  const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(html)![1]!;
  return [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) => plainText([...row[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].at(-1)![1]!));
}

describe('race history error mode (#210)', () => {
  beforeEach(() => { currentLocale = 'fr'; });

  it.each([
    ['fr', "Mode d'erreur", ['Libre', 'Correction obligatoire', 'Libre']],
    ['en', 'Error mode', ['Free typing', 'Correction required', 'Free typing']],
  ] as const)('in %s, shows an error mode column after the text language, with each race value, abandoned rows included', async (locale, header, values) => {
    currentLocale = locale;
    const html = await render(createElement(RaceHistoryTable, { entries }));
    expect(headers(html).slice(-2)).toEqual([catalogs[locale].RaceHistory.language, header]);
    expect(lastCellOfRows(html)).toEqual(values);
  });

  it.each([
    ['fr', "Voir l'évolution de mes MPM"],
    ['en', 'See how my WPM changed'],
  ] as const)('in %s, links above the table to the profile progression chart', async (locale, label) => {
    currentLocale = locale;
    const html = await render(createElement(RaceHistoryView, { history: { entries, page: 1, pageCount: 1 } }));
    const link = /<a[^>]*href="\/play\/profile#profile-progression"[^>]*>([\s\S]*?)<\/a>/.exec(html);
    expect(plainText(link![1]!)).toBe(label);
    expect(html.indexOf(link![0])).toBeLessThan(html.indexOf('<table'));
  });

  it('leaves the trend link out when there is no race yet', async () => {
    const html = await render(createElement(RaceHistoryView, { history: { entries: [], page: 1, pageCount: 1 } }));
    expect(html).not.toContain('#profile-progression');
  });
});
