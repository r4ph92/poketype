import { z } from 'zod';
import { botLevels } from '@/assets/bot-characters';
import { gameConfig } from '@/config/game';
import { errorModes, textKinds, textLanguages, isTextLength } from '@/domain/text-settings';
import { roomVisibilities } from '@/domain/room-visibility';
import { isTimeLimit } from '@/domain/time-limit';
import { parseRoomId, type RoomId } from '@/domain/room-id';

const roomIdSchema = z.string().transform((value, context): RoomId => {
  const roomId = parseRoomId(value);
  if (roomId) return roomId;
  context.issues.push({ code: 'custom', message: 'Not a room id', input: value });
  return z.NEVER;
});

export const roomRouteParamsSchema = z.object({ roomId: roomIdSchema });

export const botRequestSchema = z.strictObject({ level: z.enum(botLevels) });

export const visibilityRequestSchema = z.strictObject({ visibility: z.enum(roomVisibilities) });

// null is "Aucun"; a number must be one of the offered steps, so 10 s, 11 min or a string are refused.
export const timeLimitRequestSchema = z.strictObject({ timeLimitSeconds: z.number().nullable().refine(isTimeLimit) });

export const removalRequestSchema = z.strictObject({ memberKey: z.string().min(1).max(gameConfig.rooms.maxMemberKeyLength) });

export const textSettingsRequestSchema = z.strictObject({
  kind: z.enum(textKinds),
  errorMode: z.enum(errorModes),
  language: z.enum(textLanguages),
  length: z.number().refine(isTextLength),
  punctuation: z.boolean(),
  accents: z.boolean(),
  capitals: z.boolean(),
  digits: z.boolean(),
});

const shortFormValue = z.string().max(gameConfig.formFieldMaxLength);

export const joinWithCodeFormSchema = z.object({ code: z.string() });

export const createRoomFormSchema = z.object({ visibility: shortFormValue.optional() });
