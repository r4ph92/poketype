import { inspect } from 'node:util';
import { DrizzleQueryError } from 'drizzle-orm/errors';
import { describe, expect, it } from 'vitest';
import { DatabaseQueryError, isUniqueViolation, withoutQueryParameters } from '../../src/server/db/errors';

const fakeHash = '$scrypt$ln=16,r=8,p=2$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaGhhc2hoYXNoaGFzaGhhc2g';

function postgresError(fields: Record<string, string>): Error {
  return Object.assign(new Error('duplicate key value violates unique constraint'), fields);
}

function failedInsert(cause: Error): DrizzleQueryError {
  return new DrizzleQueryError('insert into "password_credentials" values ($1, $2)', ['user', fakeHash], cause);
}

describe('isUniqueViolation', () => {
  const duplicate = postgresError({ code: '23505', constraint_name: 'users_username_lower_unique', detail: `row (${fakeHash})` });

  it('recognizes the named unique violation wrapped in a drizzle query error', () => {
    expect(isUniqueViolation(failedInsert(duplicate), 'users_username_lower_unique')).toBe(true);
  });

  it('ignores another constraint, another error code and non-errors', () => {
    expect(isUniqueViolation(failedInsert(duplicate), 'users_guest_id_unique')).toBe(false);
    expect(isUniqueViolation(failedInsert(postgresError({ code: '23514', constraint_name: 'users_username_lower_unique' })), 'users_username_lower_unique')).toBe(false);
    expect(isUniqueViolation('23505', 'users_username_lower_unique')).toBe(false);
    expect(isUniqueViolation(null, 'users_username_lower_unique')).toBe(false);
  });
});

describe('withoutQueryParameters', () => {
  it('keeps only the Postgres code, never the query, parameters, detail or cause', () => {
    const original = failedInsert(postgresError({ code: '23514', detail: `Failing row contains (${fakeHash})` }));
    expect(inspect(original)).toContain(fakeHash);

    const sanitized = withoutQueryParameters(original);
    expect(sanitized).toBeInstanceOf(DatabaseQueryError);
    expect(sanitized.code).toBe('23514');
    expect(sanitized.cause).toBeUndefined();
    expect(inspect(sanitized)).not.toContain(fakeHash);
    expect(inspect(sanitized)).not.toContain('password_credentials');
  });

  it('answers an unknown code for an error that is not from Postgres', () => {
    expect(withoutQueryParameters(new Error(fakeHash)).code).toBeUndefined();
    expect(inspect(withoutQueryParameters(new Error(fakeHash)))).not.toContain(fakeHash);
  });
});
