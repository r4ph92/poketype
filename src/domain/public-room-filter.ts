import type { PublicRoom } from './public-room';
import type { TextLanguage } from './text-settings';

// One optional field per filter, so a second filter (the complexity, #152) is one more field, one more query key and one more line in each function below.
export type PublicRoomFilter = { language?: TextLanguage };

export const publicRoomFilterKeys = { language: 'langue' } as const;

export function roomMatchesFilter(room: PublicRoom, filter: PublicRoomFilter): boolean {
  return filter.language === undefined || room.textLanguage === filter.language;
}

// The query string for the address and the list request; empty when no filter is applied.
export function filterQueryString(filter: PublicRoomFilter): string {
  const parameters = new URLSearchParams();
  if (filter.language !== undefined) parameters.set(publicRoomFilterKeys.language, filter.language);
  const query = parameters.toString();
  return query === '' ? '' : `?${query}`;
}
