import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

// Longest textual IPv6 address with an embedded IPv4 tail.
const maxAddressLength = 45;

export function clientAddressKey(reportedAddress: string | null): string | null {
  const address = reportedAddress?.trim().toLowerCase() ?? '';
  if (address.length === 0 || address.length > maxAddressLength) return null;
  if (isIP(address) === 0) return null;
  return createHash('sha256').update(address).digest('hex');
}
