import { createHash } from 'node:crypto';
import { avatarSeedLimit } from '@/domain/pixel-avatar';
import type { SessionIdentity } from '@/server/sessions/session-store';

// The guest id is the stable one: an account keeps the guest id its races came from, so signing up never changes the avatar.
// A hash of it, so the seed shows who is who without ever sending the guest or account id to another player.
export function avatarSeedOf(stableId: string): number {
  const digest = createHash('sha256').update(`avatar:${stableId}`).digest();
  return digest.readUIntBE(0, 6) % avatarSeedLimit;
}

export function avatarSeedOfSession({ guest }: SessionIdentity): number {
  return avatarSeedOf(guest.id);
}
