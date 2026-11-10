import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseForm } from '@/server/validation/parse-form';
import { channelAuthRequestSchema } from '@/server/validation/channel-auth-schemas';
import { progressReportRequestSchema } from '@/server/validation/race-schemas';
import { botRequestSchema, removalRequestSchema, roomRouteParamsSchema, textSettingsRequestSchema, visibilityRequestSchema } from '@/server/validation/room-schemas';
import { purchaseFormSchema } from '@/server/validation/shop-form-schemas';
import { starterFormSchema } from '@/server/validation/trainer-form-schemas';

const validProgress = { sequence: 1, position: 1, keystrokes: 1, rejectedKeystrokes: 0 };
const validSettings = { language: 'fr', length: 200, punctuation: true, accents: true, capitals: true, digits: false };

type JsonCase = { name: string; schema: z.ZodType; valid: object; missing: string; wrongType: object; tooLong: object };

const jsonCases: JsonCase[] = [
  { name: 'bot', schema: botRequestSchema, valid: { level: 'easy' }, missing: 'level', wrongType: { level: 3 }, tooLong: { level: 'x'.repeat(5000) } },
  { name: 'visibility', schema: visibilityRequestSchema, valid: { visibility: 'public' }, missing: 'visibility', wrongType: { visibility: true }, tooLong: { visibility: 'x'.repeat(5000) } },
  { name: 'removal', schema: removalRequestSchema, valid: { memberKey: 'abc' }, missing: 'memberKey', wrongType: { memberKey: 12 }, tooLong: { memberKey: 'k'.repeat(65) } },
  { name: 'text settings', schema: textSettingsRequestSchema, valid: validSettings, missing: 'language', wrongType: { ...validSettings, digits: 'no' }, tooLong: { ...validSettings, language: 'f'.repeat(5000) } },
  { name: 'progress report', schema: progressReportRequestSchema, valid: validProgress, missing: 'position', wrongType: { ...validProgress, position: '1' }, tooLong: { ...validProgress, position: 2 ** 40 } },
  { name: 'channel auth', schema: channelAuthRequestSchema, valid: { socketId: '123.456' }, missing: 'socketId', wrongType: { socketId: 123 }, tooLong: { socketId: `${'1'.repeat(30)}.1` } },
];

describe.each(jsonCases)('the $name request schema', ({ schema, valid, missing, wrongType, tooLong }) => {
  it('accepts a valid body', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('rejects a body with a missing field', () => {
    const { [missing]: _removed, ...incomplete } = valid as Record<string, unknown>;
    expect(schema.safeParse(incomplete).success).toBe(false);
  });

  it('rejects a wrong type', () => {
    expect(schema.safeParse(wrongType).success).toBe(false);
  });

  it('rejects an unknown extra field', () => {
    expect(schema.safeParse({ ...valid, winner: 'Zoe' }).success).toBe(false);
  });

  it('rejects an over-long value', () => {
    expect(schema.safeParse(tooLong).success).toBe(false);
  });

  it.each([null, [], 'text', 4])('rejects %j as a body', (body) => {
    expect(schema.safeParse(body).success).toBe(false);
  });
});

describe('the progress report schema', () => {
  it('requires a sequence of at least 1', () => {
    expect(progressReportRequestSchema.safeParse({ ...validProgress, sequence: 0 }).success).toBe(false);
  });

  it('rejects fractions and negative counters', () => {
    expect(progressReportRequestSchema.safeParse({ ...validProgress, keystrokes: 1.5 }).success).toBe(false);
    expect(progressReportRequestSchema.safeParse({ ...validProgress, position: -1 }).success).toBe(false);
  });
});

describe('the text settings schema', () => {
  it('rejects a length that is not on the step', () => {
    expect(textSettingsRequestSchema.safeParse({ ...validSettings, length: 201 }).success).toBe(false);
  });

  it('rejects an unknown language', () => {
    expect(textSettingsRequestSchema.safeParse({ ...validSettings, language: 'de' }).success).toBe(false);
  });
});

describe('the channel auth schema', () => {
  it.each(['abc', '123.456\n', '123', '.456', '1.2.3'])('rejects the socket id %j', (socketId) => {
    expect(channelAuthRequestSchema.safeParse({ socketId }).success).toBe(false);
  });
});

describe('the room route params schema', () => {
  it('accepts a canonical room id', () => {
    expect(roomRouteParamsSchema.safeParse({ roomId: '00000000-0000-4000-8000-000000000000' }).success).toBe(true);
  });

  it.each([undefined, 3, '%', 'not-a-uuid', '00000000-0000-4000-8000-00000000000G', '00000000-0000-4000-8000-00000000000A'])('rejects %j', (roomId) => {
    expect(roomRouteParamsSchema.safeParse({ roomId }).success).toBe(false);
  });
});

describe('parseForm', () => {
  function form(fields: Record<string, string>): FormData {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  }

  it('reads the schema fields and ignores the framework fields', () => {
    const data = form({ item: 'poke-ball', quantity: '2', purchaseKey: 'k', $ACTION_ID_abc: '' });
    expect(parseForm(data, purchaseFormSchema)).toEqual({ item: 'poke-ball', quantity: '2', purchaseKey: 'k' });
  });

  it('rejects a form with a missing field', () => {
    expect(parseForm(form({ item: 'poke-ball', quantity: '2' }), purchaseFormSchema)).toBeNull();
  });

  it('rejects an uploaded file where text is expected', () => {
    const data = form({ item: 'poke-ball', quantity: '2' });
    data.set('purchaseKey', new File(['x'], 'key.txt'));
    expect(parseForm(data, purchaseFormSchema)).toBeNull();
  });

  it('rejects an over-long value', () => {
    expect(parseForm(form({ starter: 's'.repeat(5000) }), starterFormSchema)).toBeNull();
  });

  it('accepts a form without its optional field', () => {
    expect(parseForm(form({ starter: '1' }), starterFormSchema)).toEqual({ starter: '1', next: undefined });
  });
});
