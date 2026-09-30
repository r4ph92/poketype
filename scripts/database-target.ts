import type { DatabaseTarget } from '../src/server/env';

export function readDatabaseTarget(argv: readonly string[]): DatabaseTarget {
  return argv.includes('--target=test') ? 'test' : 'default';
}
