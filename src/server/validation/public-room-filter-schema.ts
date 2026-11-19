import { z } from 'zod';
import { publicRoomFilterKeys, type PublicRoomFilter } from '@/domain/public-room-filter';
import { textLanguages } from '@/domain/text-settings';

// An unknown or repeated value is not an error: the filter is simply not applied, so every room is listed.
const languageParameter = z.enum(textLanguages).optional().catch(undefined);

const publicRoomFilterSchema = z.object({ [publicRoomFilterKeys.language]: languageParameter });

export function parsePublicRoomFilter(parameters: Record<string, string | string[] | undefined>): PublicRoomFilter {
  const parsed = publicRoomFilterSchema.parse(parameters);
  return { language: parsed[publicRoomFilterKeys.language] };
}
