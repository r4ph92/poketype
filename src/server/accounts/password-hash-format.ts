export type ScryptCost = { logN: number; blockSize: number; parallelism: number };

export type ParsedPasswordHash = { cost: ScryptCost; salt: Buffer; key: Buffer };

const phcScrypt = /^\$scrypt\$ln=(\d{1,2}),r=(\d{1,2}),p=(\d{1,2})\$([A-Za-z0-9+/]{22})\$([A-Za-z0-9+/]{43})$/;

const costBounds: Record<keyof ScryptCost, number> = { logN: 20, blockSize: 16, parallelism: 16 };

export function formatPasswordHash({ logN, blockSize, parallelism }: ScryptCost, salt: Buffer, key: Buffer): string {
  return `$scrypt$ln=${logN},r=${blockSize},p=${parallelism}$${unpaddedBase64(salt)}$${unpaddedBase64(key)}`;
}

export function parsePasswordHash(stored: string): ParsedPasswordHash | null {
  const match = phcScrypt.exec(stored);
  if (!match) return null;
  const [, logN, blockSize, parallelism, salt, key] = match;
  const cost = { logN: Number(logN), blockSize: Number(blockSize), parallelism: Number(parallelism) };
  if (!isWithinBounds(cost)) return null;
  return { cost, salt: Buffer.from(salt!, 'base64'), key: Buffer.from(key!, 'base64') };
}

function isWithinBounds(cost: ScryptCost): boolean {
  return (Object.keys(costBounds) as (keyof ScryptCost)[]).every((name) => cost[name] >= 1 && cost[name] <= costBounds[name]);
}

function unpaddedBase64(bytes: Buffer): string {
  return bytes.toString('base64').replace(/=+$/, '');
}
