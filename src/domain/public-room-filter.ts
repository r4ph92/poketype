import type { PublicRoom } from './public-room';
import type { ComplexityLevel } from './text-complexity';
import type { TextLanguage } from './text-settings';

// One optional field per filter: a filter not set keeps every room.
export type PublicRoomFilter = { language?: TextLanguage; complexity?: ComplexityLevel };

export const publicRoomFilterKeys = { language: 'langue', complexity: 'complexite' } as const;

export function roomMatchesFilter(room: PublicRoom, filter: PublicRoomFilter): boolean {
  if (filter.language !== undefined && room.textLanguage !== filter.language) return false;
  return filter.complexity === undefined || room.complexity === filter.complexity;
}

// The query string for the address and the list request; empty when no filter is applied.
export function filterQueryString(filter: PublicRoomFilter): string {
  const parameters = new URLSearchParams();
  if (filter.language !== undefined) parameters.set(publicRoomFilterKeys.language, filter.language);
  if (filter.complexity !== undefined) parameters.set(publicRoomFilterKeys.complexity, filter.complexity);
  const query = parameters.toString();
  return query === '' ? '' : `?${query}`;
}
