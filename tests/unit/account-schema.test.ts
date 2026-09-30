import { PgDialect, getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { usernamePattern } from '../../src/domain/username';
import { users } from '../../src/server/db/schema';

describe('users table', () => {
  it('checks usernames in the database with the same rule the form uses', () => {
    const [check] = getTableConfig(users).checks;
    const { sql } = new PgDialect().sqlToQuery(check!.value);
    expect(sql).toBe(`"users"."username" ~ '${usernamePattern.source}'`);
  });
});
