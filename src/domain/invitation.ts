import type { GuestId } from './guest-id';
import { isJsonObject } from './json-guards';
import type { RoomPhase } from './room-phase';

// Who first used a link: both are null while it is unused. addressKey is null when the platform reported no client address.
// revoked is true once the host kicked the guest who used the link: the link then stays dead for everyone.
export type InvitationUse = { usedByGuestId: GuestId | null; usedAddressKey: string | null; revoked: boolean };

export type Redeemer = { guestId: GuestId; addressKey: string | null };

export type RedemptionRequest = { use: InvitationUse; redeemer: Redeemer; phase: RoomPhase; isMember: boolean };

export type RedemptionOutcome = 'join' | 'rejoin' | 'already-member' | 'used' | 'revoked' | 'race-started' | 'room-closed';

// A fresh link admits one newcomer to the waiting room. Its first user may come back through it (same guest, or same address for a new guest session)
// while the room waits or shows results; anyone else finds it used. Pupils behind one school address share it, so the address rule cannot tell them apart.
export function redemptionOutcome({ use, redeemer, phase, isMember }: RedemptionRequest): RedemptionOutcome {
  if (phase === 'closed') return 'room-closed';
  if (isMember) return 'already-member';
  if (use.revoked) return 'revoked';
  if (use.usedByGuestId === null) return phase === 'waiting' ? 'join' : 'race-started';
  if (!isFirstUser(use, redeemer)) return 'used';
  return phase === 'waiting' || phase === 'results' ? 'rejoin' : 'race-started';
}

function isFirstUser({ usedByGuestId, usedAddressKey }: Pick<InvitationUse, 'usedByGuestId' | 'usedAddressKey'>, { guestId, addressKey }: Redeemer): boolean {
  return usedByGuestId === guestId || (usedAddressKey !== null && usedAddressKey === addressKey);
}

// What the host's list shows for one link: never its token, which only the browser that created it holds.
export type InvitationView = { id: string; createdAt: number; usedBy: string | null; revoked: boolean };

export function parseInvitationViews(value: unknown): InvitationView[] | null {
  if (!Array.isArray(value)) return null;
  const views = value.map(parseInvitationView);
  return views.every((view) => view !== null) ? views : null;
}

function parseInvitationView(value: unknown): InvitationView | null {
  if (!isJsonObject(value)) return null;
  const { id, createdAt, usedBy, revoked } = value;
  if (typeof id !== 'string' || id.length === 0 || !Number.isSafeInteger(createdAt) || (usedBy !== null && typeof usedBy !== 'string') || typeof revoked !== 'boolean') return null;
  return { id, createdAt: createdAt as number, usedBy, revoked };
}
