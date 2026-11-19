import { z } from 'zod';
import { publicRoomFilterKeys, type PublicRoomFilter } from '@/domain/public-room-filter';
import { complexityLevels } from '@/domain/text-complexity';
import { textLanguages } from '@/domain/text-settings';

// An unknown or repeated value is not an error: that filter is simply not applied, so every room is listed.
const languageParameter = z.enum(textLanguages).optional().catch(undefined);

const complexityParameter = z.enum(complexityLevels).optional().catch(undefined);

const publicRoomFilterSchema = z.object({
  [publicRoomFilterKeys.language]: languageParameter,
  [publicRoomFilterKeys.complexity]: complexityParameter,
});

export function parsePublicRoomFilter(parameters: Record<string, string | string[] | undefined>): PublicRoomFilter {
  const parsed = publicRoomFilterSchema.parse(parameters);
  return { language: parsed[publicRoomFilterKeys.language], complexity: parsed[publicRoomFilterKeys.complexity] };
}
