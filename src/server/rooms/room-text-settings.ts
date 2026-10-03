import { eq } from 'drizzle-orm';
import type { RoomId } from '@/domain/room-id';
import type { TextSettings } from '@/domain/text-settings';
import * as schema from '../db/schema';
import type { DatabaseExecutor } from '../db/types';

const { rooms } = schema;

export const textSettingsColumns = {
  language: rooms.textLanguage,
  length: rooms.textLength,
  punctuation: rooms.textPunctuation,
  accents: rooms.textAccents,
  capitals: rooms.textCapitals,
  digits: rooms.textDigits,
};

export async function findTextSettings(executor: DatabaseExecutor, roomId: RoomId): Promise<TextSettings | null> {
  const [settings] = await executor.select(textSettingsColumns).from(rooms).where(eq(rooms.id, roomId));
  return settings ?? null;
}

export async function storeTextSettings(executor: DatabaseExecutor, roomId: RoomId, settings: TextSettings): Promise<void> {
  const { language, length, punctuation, accents, capitals, digits } = settings;
  await executor
    .update(rooms)
    .set({ textLanguage: language, textLength: length, textPunctuation: punctuation, textAccents: accents, textCapitals: capitals, textDigits: digits })
    .where(eq(rooms.id, roomId));
}
