import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import type { RaceOutcome } from '../../src/domain/race-results';
import { ResultsTable } from '../../src/features/race/ResultsTable';
import type { ResultsTableRow } from '../../src/features/race/results-table';

type Locale = 'fr' | 'en';

type ProviderProps = ComponentProps<typeof NextIntlClientProvider>;

const catalogs = { fr, en } as const;
const dash = '—';
const humanRacer = { bot: null, partner: 'charmander', bonuses: [] } as const;
const botRacer = { bot: { character: 'brock', level: 'beginner' }, partner: 'onix' } as unknown as Pick<ResultsTableRow, 'bot' | 'partner'>;

function rankedRow(memberKey: string, trainerName: string, place: number, outcome: RaceOutcome, extra: Partial<ResultsTableRow> = {}): ResultsTableRow {
  return {
    memberKey, trainerName, avatarSeed: null, isViewer: false, ...humanRacer,
    standing: 'ranked', outcome, place, grossWpm: 41.6, rawWpm: 43.2, score: 40, accuracy: 0.9263, errors: 1234, finishMs: outcome === 'finished' ? 41_250 : null,
    ...extra,
  } as unknown as ResultsTableRow;
}

const rows: ResultsTableRow[] = [
  rankedRow('a', 'Alex', 1, 'finished', { isViewer: true }),
  rankedRow('b', 'Pierre', 2, 'timedOut', { ...botRacer, bonuses: [] }),
  rankedRow('n', 'Nina', 3, 'abandoned'),
  rankedRow('i', 'Inès', 3, 'inactive'),
];

type Cell = { tag: string; attributes: string; text: string };
type Row = { attributes: string; cells: Cell[] };
type RenderedTable = { caption: string; headers: Cell[]; rows: Row[] };

function render(locale: Locale): RenderedTable {
  const messages = { Room: catalogs[locale].Room, Bots: { botTag: catalogs[locale].Bots.botTag }, Pokemon: catalogs[locale].Pokemon, Animation: catalogs[locale].Animation };
  const html = renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages, timeZone: 'UTC' } as ProviderProps, createElement(ResultsTable, { rows })));
  const [head, body] = [section(html, 'thead'), section(html, 'tbody')];
  return { caption: plainText(section(html, 'caption')), headers: cellsOf(head), rows: [...body.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].map((match) => ({ attributes: match[1]!, cells: cellsOf(match[2]!) })) };
}

function section(html: string, tag: string): string {
  return new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(html)![1]!;
}

function cellsOf(html: string): Cell[] {
  return [...html.matchAll(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g)].map((match) => ({ tag: match[1]!, attributes: match[2]!, text: plainText(match[3]!) }));
}

function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/[ \t\n]+/g, ' ').trim();
}

describe('the complete results table (#138)', () => {
  it.each(['fr', 'en'] as const)('in %s, is a captioned table with nine column headers in the brief order', (locale) => {
    const room = catalogs[locale].Room;
    const table = render(locale);

    expect(table.caption).toBe(room.resultsCaption);
    expect(table.headers.every((header) => header.tag === 'th' && header.attributes.includes('scope="col"'))).toBe(true);
    expect(table.headers.map((header) => header.text)).toEqual([room.placeColumn, room.trainerColumn, room.wpmColumn, room.rawWpmColumn, room.accuracyColumn, room.errorsColumn, room.timeColumn, room.statusColumn, room.bonusColumn]);
  });

  it('names the place and participant columns "Rang" and "Participant" in French, as the acceptance criterion lists them', () => {
    expect([fr.Room.placeColumn, fr.Room.trainerColumn]).toEqual(['Rang', 'Participant']);
  });

  it.each(['fr', 'en'] as const)('in %s, gives every racer nine cells, a row header, a status before the bonus dash, and marks only the viewer', (locale) => {
    const room = catalogs[locale].Room;
    const bodyRows = render(locale).rows;

    expect(bodyRows).toHaveLength(rows.length);
    for (const row of bodyRows) {
      expect(row.cells).toHaveLength(9);
      expect(row.cells[1]!.tag).toBe('th');
      expect(row.cells[1]!.attributes).toContain('scope="row"');
      expect(row.cells[8]!.text).toBe(dash);
    }
    expect(bodyRows.map((row) => row.cells[7]!.text)).toEqual([room.finished, room.timedOut, room.abandoned, room.abandoned]);
    expect(bodyRows.map((row) => row.attributes.includes('bg-gold'))).toEqual([true, false, false, false]);
    expect(bodyRows[0]!.cells[1]!.text).toContain(room.youMarker);
    expect(bodyRows[1]!.cells[1]!.text).toContain(catalogs[locale].Bots.botTag);
  });

  it.each([
    ['fr', '92,6', '1\u202f234', '41,3'],
    ['en', '92.6', '1,234', '41.3'],
  ] as const)('in %s, formats the numbers of a finisher with the locale', (locale, accuracy, errors, seconds) => {
    const room = catalogs[locale].Room;
    const finisher = render(locale).rows[0]!;

    expect(finisher.cells.slice(2, 7).map((cell) => cell.text)).toEqual(['42', '43', room.progressPercent.replace('{percent}', accuracy), errors, room.finishTime.replace('{seconds}', seconds)]);
  });

  it.each(['fr', 'en'] as const)('in %s, lists the catch-up bonuses each racer received under "Bonus reçus" (BONUS-03)', (locale) => {
    const room = catalogs[locale].Room;
    const withBonuses = [rankedRow('z', 'Zoé', 1, 'finished', { bonuses: ['remove-words', 'remove-words'] }), rankedRow('l', 'Léo', 2, 'timedOut', { bonuses: ['remove-words'] })];
    const html = renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages: { Room: room, Bots: { botTag: catalogs[locale].Bots.botTag }, Pokemon: catalogs[locale].Pokemon, Animation: catalogs[locale].Animation }, timeZone: 'UTC' } as ProviderProps, createElement(ResultsTable, { rows: withBonuses })));
    const bonusCells = [...html.matchAll(/<td data-bonuses="(\d)"[^>]*>([^<]*)<\/td>/g)].map((match) => [match[1], plainText(match[2]!)]);

    const unbroken = room.bonusRemoveWords.replaceAll(' ', '\u00a0');
    expect(bonusCells).toEqual([['2', room.bonusCount.replace('{bonus}', unbroken).replace('{count}', '2')], ['1', unbroken]]);
  });

  it('lets a bonus cell wrap only between the bonus name and its count, so a narrow table never cuts it', () => {
    const html = renderToStaticMarkup(createElement(NextIntlClientProvider, { locale: 'fr', messages: { Room: catalogs.fr.Room, Bots: { botTag: catalogs.fr.Bots.botTag }, Pokemon: catalogs.fr.Pokemon, Animation: catalogs.fr.Animation }, timeZone: 'UTC' } as ProviderProps, createElement(ResultsTable, { rows: [rankedRow('z', 'Zoé', 1, 'finished', { bonuses: ['remove-words', 'remove-words'] })] })));
    const [, classes, text] = html.match(/<td data-bonuses="2" class="([^"]*)">([^<]*)<\/td>/)!;

    expect(classes).not.toContain('whitespace-nowrap');
    expect(text).toBe('-3\u00a0mots ×2');
  });

  it('lets "Non terminé" and a status badge take two lines, so nine columns fit a 1280 px screen', () => {
    const html = renderToStaticMarkup(createElement(NextIntlClientProvider, { locale: 'fr', messages: { Room: catalogs.fr.Room, Bots: { botTag: catalogs.fr.Bots.botTag }, Pokemon: catalogs.fr.Pokemon, Animation: catalogs.fr.Animation }, timeZone: 'UTC' } as ProviderProps, createElement(ResultsTable, { rows: [rankedRow('b', 'Pierre', 1, 'timedOut', { ...botRacer, bonuses: [] })] })));
    const statusClasses = html.match(/<td data-status="timedOut" class="([^"]*)"/)![1]!;
    const timeClasses = [...html.matchAll(/<td class="([^"]*)">([^<]*)<\/td>/g)].find((match) => match[2] === catalogs.fr.Room.unfinished)![1]!;

    expect(statusClasses).not.toContain('whitespace-nowrap');
    expect(timeClasses).not.toContain('whitespace-nowrap');
  });
});
