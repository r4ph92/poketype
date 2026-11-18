import type { GuestId } from '@/domain/guest-id';

// A guest identity owns an account's races, so a participant who signed up later is still recognised by the same id.
export function isRaceParticipant(participants: readonly { guestId: GuestId }[], viewerGuestId: GuestId): boolean {
  return participants.some((participant) => participant.guestId === viewerGuestId);
}
