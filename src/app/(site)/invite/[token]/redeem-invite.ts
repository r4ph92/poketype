import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { GuestId } from '@/domain/guest-id';
import { invitationEntryPath, parseInvitationToken, type InvitationToken } from '@/domain/invitation-token';
import { roomPath } from '@/domain/room-id';
import { switchRoomPath } from '@/domain/room-switch';
import { requireStarter } from '@/features/trainer/starter-gate';
import { database } from '@/server/db/client';
import { readClientAddressKey } from '@/server/http/client-address';
import { redeemInvitation, type RedeemRefusal } from '@/server/invitations/redeem-invitation';
import { announceRoomChange } from '@/server/push/room-publisher';
import { findCurrentGuest } from '@/server/sessions/current-guest';

// Opening the link is the join intent, like a room link (H1); cached so a second render in the same request never redeems twice.
// A visitor without a trainer picks a name first, then a starter, and each step comes back here.
export const redeemInvite = cache(async (rawToken: string): Promise<RedeemRefusal> => {
  const token = parseInvitationToken(rawToken);
  if (!token) return 'invalid';
  const guest = await findCurrentGuest();
  if (!guest) redirect(invitationEntryPath(token));
  return redeemAs(token, guest.id);
});

async function redeemAs(token: InvitationToken, guestId: GuestId): Promise<RedeemRefusal> {
  await requireStarter(guestId, { kind: 'invite', token });
  const result = await redeemInvitation(database, { token, guestId, addressKey: await readClientAddressKey(), redeemedAt: new Date() });
  if (result.outcome === 'joined') announceRoomChange(result.roomId);
  if (result.outcome === 'joined' || result.outcome === 'already-member') redirect(roomPath(result.roomId));
  if (result.outcome === 'in-other-room') redirect(switchRoomPath({ kind: 'invite', token }));
  return result.outcome;
}
