import 'server-only';
import { createHash } from 'node:crypto';
import { avatarSeedLimit } from '@/domain/pixel-avatar';
import type { SessionIdentity } from '@/server/sessions/session-store';

// A hash of the stable id, so the seed shows who is who without ever sending the guest or account id to another player.
export function avatarSeedOf(stableId: string): number {
  const digest = createHash('sha256').update(`avatar:${stableId}`).digest();
  return digest.readUIntBE(0, 6) % avatarSeedLimit;
}

export function avatarSeedOfSession({ guest, account }: SessionIdentity): number {
  return avatarSeedOf(account?.id ?? guest.id);
}
