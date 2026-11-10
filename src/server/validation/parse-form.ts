import type { z } from 'zod';

// Next adds its own $ACTION_* fields to every action form, so only the schema's keys are read and extra fields are ignored.
export function parseForm<Shape extends z.ZodRawShape>(formData: FormData, schema: z.ZodObject<Shape>): z.output<z.ZodObject<Shape>> | null {
  const fields = Object.fromEntries(Object.keys(schema.shape).map((name) => [name, formData.get(name) ?? undefined]));
  const parsed = schema.safeParse(fields);
  return parsed.success ? parsed.data : null;
}
