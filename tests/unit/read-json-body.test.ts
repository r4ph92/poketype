import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { readJsonBody, refusalOf } from '@/server/validation/read-json-body';

const schema = z.strictObject({ name: z.string() });

function requestWith(body: string | Uint8Array): Request {
  return new Request('http://localhost/x', { method: 'POST', body: body as BodyInit });
}

describe('readJsonBody', () => {
  it('returns the parsed value for a body that matches the schema', async () => {
    expect(await readJsonBody(requestWith('{"name":"Zoé"}'), schema, 64)).toEqual({ kind: 'ok', value: { name: 'Zoé' } });
  });

  it('reports a body over the byte cap as too large', async () => {
    expect(await readJsonBody(requestWith('{"name":"' + 'a'.repeat(100) + '"}'), schema, 64)).toEqual({ kind: 'too-large' });
  });

  it.each(['{', '', 'null', '[]', '{"name":3}', '{"name":"a","extra":1}'])('reports %j as invalid', async (text) => {
    expect(await readJsonBody(requestWith(text), schema, 64)).toEqual({ kind: 'invalid' });
  });

  it('reports bytes that are not UTF-8 as invalid', async () => {
    expect(await readJsonBody(requestWith(new Uint8Array([0xff, 0xfe])), schema, 64)).toEqual({ kind: 'invalid' });
  });

  it('answers 413 for too large and 400 for invalid, with no body', async () => {
    expect(refusalOf({ kind: 'too-large' }).status).toBe(413);
    const invalid = refusalOf({ kind: 'invalid' });
    expect(invalid.status).toBe(400);
    expect(await invalid.text()).toBe('');
  });
});
