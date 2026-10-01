import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { usernamePattern } from '../../src/domain/username';

const metaDirectory = path.join(__dirname, '../../drizzle/meta');

function readLatestSnapshot(): { tables: Record<string, { checkConstraints: Record<string, { value: string }> }> } {
  const latest = readdirSync(metaDirectory)
    .filter((file) => file.endsWith('_snapshot.json'))
    .sort()
    .at(-1)!;
  return JSON.parse(readFileSync(path.join(metaDirectory, latest), 'utf8'));
}

describe('latest migration snapshot', () => {
  it('checks usernames in the database with the same rule the form uses', () => {
    const check = readLatestSnapshot().tables['public.users']!.checkConstraints.users_username_check!;
    expect(check.value).toBe(`"users"."username" ~ '${usernamePattern.source}'`);
  });
});
