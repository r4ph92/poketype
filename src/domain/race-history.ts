import { gameConfig } from '@/config/game';
import type { TextLanguage } from './text-settings';

// place is null for a race the player abandoned; participantCount counts humans and bots; accuracy is a 0..1 ratio.
export type RaceHistoryEntry = {
  raceId: string;
  endedAt: Date;
  place: number | null;
  participantCount: number;
  isAbandoned: boolean;
  isInactive: boolean;
  grossWpm: number | null;
  accuracy: number | null;
  textLanguage: TextLanguage;
};

export type RaceHistoryPage = { entries: RaceHistoryEntry[]; page: number; pageCount: number };

export type PageLink = { kind: 'page'; page: number } | { kind: 'gap'; after: number };

const firstPage = 1;
const wholeNumberPattern = /^\d+$/;

// Anything that is not a plain positive whole number (abc, -1, 1.5, empty) opens the first page.
export function parsePageParam(raw: string | string[] | undefined): number {
  if (typeof raw !== 'string' || !wholeNumberPattern.test(raw)) return firstPage;
  return Math.max(firstPage, Math.min(Number(raw), Number.MAX_SAFE_INTEGER));
}

export function pageCountOf(totalRaces: number): number {
  return Math.max(firstPage, Math.ceil(totalRaces / gameConfig.raceHistory.pageSize));
}

// A page past the last one shows the last page.
export function clampPage(requestedPage: number, pageCount: number): number {
  return Math.min(Math.max(requestedPage, firstPage), pageCount);
}

export function pageOffset(page: number): number {
  return (page - firstPage) * gameConfig.raceHistory.pageSize;
}

// The first and last pages, the current one and its neighbours; a gap stands for the pages left out.
export function pageLinks(currentPage: number, pageCount: number): PageLink[] {
  const window = gameConfig.raceHistory.pageLinkWindow;
  const shown = visiblePages(currentPage, pageCount, window);
  return shown.flatMap((page, index) => {
    const link: PageLink = { kind: 'page', page };
    const previous = shown[index - 1];
    return previous !== undefined && page - previous > 1 ? [{ kind: 'gap', after: previous } as PageLink, link] : [link];
  });
}

function visiblePages(currentPage: number, pageCount: number, window: number): number[] {
  const pages: number[] = [];
  for (let page = firstPage; page <= pageCount; page += 1) {
    if (isShown(page, currentPage, pageCount, window)) pages.push(page);
  }
  return pages;
}

function isShown(page: number, currentPage: number, pageCount: number, window: number): boolean {
  return page === firstPage || page === pageCount || Math.abs(page - currentPage) <= window;
}
