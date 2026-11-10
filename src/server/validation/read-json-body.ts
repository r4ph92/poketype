import type { z } from 'zod';
import { emptyResponse } from '@/server/http/empty-response';
import { readCappedBody } from '@/server/http/read-capped-body';

export type JsonBody<Value> = { kind: 'ok'; value: Value } | { kind: 'too-large' } | { kind: 'invalid' };

export async function readJsonBody<Schema extends z.ZodType>(request: Request, schema: Schema, maxBytes: number): Promise<JsonBody<z.output<Schema>>> {
  const body = await readCappedBody(request, maxBytes);
  if (body.kind === 'too-large') return body;
  if (body.kind === 'unreadable') return { kind: 'invalid' };
  const json = parseJson(body.text);
  const parsed = schema.safeParse(json);
  return parsed.success ? { kind: 'ok', value: parsed.data } : { kind: 'invalid' };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function refusalOf(body: { kind: 'too-large' } | { kind: 'invalid' }): Response {
  return emptyResponse(body.kind === 'too-large' ? 413 : 400);
}
