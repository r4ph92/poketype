import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';
import { gameConfig } from '@/config/game';
import { ConcurrencyGate } from './concurrency-gate';
import { formatPasswordHash, parsePasswordHash, type ScryptCost } from './password-hash-format';

const deriveScryptKey = promisify<string, Buffer, number, ScryptOptions, Buffer>(scrypt);

const currentCost: ScryptCost = { logN: 16, blockSize: 8, parallelism: 2 };
const saltBytes = 16;
const keyBytes = 32;
const maxMemoryBytes = 256 * 1024 * 1024;

// Each hash takes about 64 MiB and 0.3 s, so a per-process gate keeps a burst of signups from exhausting the server.
const hashingGate = new ConcurrencyGate(gameConfig.account.passwordHashing);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltBytes);
  const key = await hashingGate.run(() => deriveKey(password, salt, currentCost));
  return formatPasswordHash(currentCost, salt, key);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parsed = parsePasswordHash(storedHash);
  if (!parsed) return false;
  return hashingGate.run(async () => {
    const key = await deriveKey(password, parsed.salt, parsed.cost).catch(() => null);
    return key !== null && timingSafeEqual(key, parsed.key);
  });
}

function deriveKey(password: string, salt: Buffer, { logN, blockSize, parallelism }: ScryptCost): Promise<Buffer> {
  const options = { N: 2 ** logN, r: blockSize, p: parallelism, maxmem: maxMemoryBytes };
  return deriveScryptKey(password.normalize('NFC'), salt, keyBytes, options);
}
