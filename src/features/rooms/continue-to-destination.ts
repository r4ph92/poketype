import 'server-only';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { pathOf, type StarterDestination } from '@/domain/starter-destination';
import { requireHostingAccount } from './hosting-gate';
import { redirectToNewRoom } from './new-room';
import { redirectToPlacedRoom } from './race-placement';

// Not a Server Action: the guest always comes from the caller's session. Pages only redirect, so the two actions run here.
export async function continueTo(destination: StarterDestination, guestId: GuestId): Promise<never> {
  if (destination.kind === 'find-race') return redirectToPlacedRoom(guestId);
  if (destination.kind === 'create-room') {
    await requireHostingAccount();
    return redirectToNewRoom(guestId, destination);
  }
  redirect(pathOf(destination));
}
