type PostgresErrorFields = { code?: unknown; constraint_name?: unknown };

const uniqueViolationCode = '23505';
const maxCauseDepth = 5;

export class DatabaseQueryError extends Error {
  constructor(readonly code: string | undefined) {
    super(`Database query failed (${code ?? 'unknown'})`);
    this.name = 'DatabaseQueryError';
  }
}

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const postgresError = findPostgresError(error);
  return postgresError?.code === uniqueViolationCode && postgresError.constraint_name === constraint;
}

// Drizzle and postgres errors carry the query parameters and the failing row, which can include a password hash.
export function withoutQueryParameters(error: unknown): DatabaseQueryError {
  const code = findPostgresError(error)?.code;
  return new DatabaseQueryError(typeof code === 'string' ? code : undefined);
}

function findPostgresError(error: unknown): PostgresErrorFields | null {
  let current = error;
  for (let depth = 0; depth < maxCauseDepth && current instanceof Error; depth += 1) {
    if ('code' in current) return current as PostgresErrorFields;
    current = current.cause;
  }
  return null;
}
