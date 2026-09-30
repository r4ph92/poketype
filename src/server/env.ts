export type DatabaseTarget = 'default' | 'test';

const variableByTarget: Record<DatabaseTarget, string> = {
  default: 'DATABASE_URL',
  test: 'TEST_DATABASE_URL',
};

export function readDatabaseUrl(target: DatabaseTarget = 'default'): string {
  const name = variableByTarget[target];
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and adjust it.`);
  }
  return value;
}
