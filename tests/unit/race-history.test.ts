import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/config/game';
import { clampPage, pageCountOf, pageLinks, pageOffset, parsePageParam } from '../../src/domain/race-history';
import { toEntry, type HistoryRow } from '../../src/server/trainer/race-history';

describe('parsePageParam', () => {
  it.each([
    ['2', 2],
    ['1', 1],
    ['007', 7],
    [undefined, 1],
    ['abc', 1],
    ['-1', 1],
    ['0', 1],
    ['1.5', 1],
    ['', 1],
    ['2e3', 1],
    [['2', '3'], 1],
  ])('reads %j as page %i', (raw, page) => {
    expect(parsePageParam(raw)).toBe(page);
  });

  it('keeps a huge number a whole number so it clamps to the last page', () => {
    expect(clampPage(parsePageParam('9'.repeat(40)), 3)).toBe(3);
  });
});

describe('pagination math', () => {
  it.each([[0, 1], [1, 1], [20, 1], [21, 2], [25, 2], [40, 2], [41, 3]])('%i races make %i pages', (races, pages) => {
    expect(pageCountOf(races)).toBe(pages);
  });

  it('puts the remaining 5 of 25 races on page 2', () => {
    expect(pageOffset(2)).toBe(20);
    expect(25 - pageOffset(2)).toBe(5);
  });

  it('clamps a page past the last, and below the first', () => {
    expect(clampPage(99, 2)).toBe(2);
    expect(clampPage(0, 2)).toBe(1);
    expect(clampPage(2, 2)).toBe(2);
  });
});

describe('pageLinks', () => {
  const pages = (current: number, count: number) => pageLinks(current, count).map((link) => (link.kind === 'gap' ? '…' : link.page));

  it('lists every page when there are few', () => {
    expect(pages(1, 3)).toEqual([1, 2, 3]);
  });

  it('keeps the first and last pages and marks the pages left out', () => {
    expect(pages(10, 20)).toEqual([1, '…', 8, 9, 10, 11, 12, '…', 20]);
  });

  it('does not mark a gap between neighbours', () => {
    expect(pages(4, 8)).toEqual([1, 2, 3, 4, 5, 6, '…', 8]);
  });
});

describe('toEntry', () => {
  const row: HistoryRow = { raceId: 'race', roomId: 'room', endedAt: new Date('2026-11-01T10:00:00Z'), place: 2, participantCount: 4, isAbandoned: false, isInactive: false, grossWpm: 31.5, accuracy: 0.95, textLanguage: 'fr' };

  it('keeps a settled race as it is', () => {
    expect(toEntry(row)).toEqual(row);
  });

  it('refuses a race without an end time', () => {
    expect(() => toEntry({ ...row, endedAt: null })).toThrow(/without an end time/);
  });
});

describe('display time zone', () => {
  it('is a zone the runtime knows', () => {
    expect(() => new Intl.DateTimeFormat('fr', { timeZone: gameConfig.displayTimeZone })).not.toThrow();
  });
});
