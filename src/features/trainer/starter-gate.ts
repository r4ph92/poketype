import 'server-only';
import { redirect } from 'next/navigation';
import type { GuestId } from '@/domain/guest-id';
import { chooseStarterPath, type StarterDestination } from '@/domain/starter-destination';
import { database } from '@/server/db/client';
import { hasStarter } from '@/server/trainer/partner';

// Every way into a room passes here: a player races with their own partner, so one without a starter picks it first, then carries on.
export async function requireStarter(guestId: GuestId, destination: StarterDestination): Promise<void> {
  if (await hasStarter(database, guestId)) return;
  redirect(chooseStarterPath(destination));
}
