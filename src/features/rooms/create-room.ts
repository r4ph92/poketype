'use server';

import { parseHostRole } from '@/domain/host-role';
import { redirect } from 'next/navigation';
import { defaultRoomVisibility, isRoomVisibility } from '@/domain/room-visibility';
import { requireHostingAccount } from './hosting-gate';
import { requireStarter } from '@/features/trainer/starter-gate';
import { findCurrentGuest } from '@/server/sessions/current-guest';
import { parseForm } from '@/server/validation/parse-form';
import { createRoomFormSchema } from '@/server/validation/room-schemas';
import { redirectToNewRoom } from './new-room';
import { requireNoOtherRoom } from './one-room-gate';

// The quick "Créer une salle" buttons send no choice, and an unknown value is not worth an error: both open the default public room, the host racing.
export async function createRoom(submitted: unknown): Promise<void> {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  await requireHostingAccount();
  const form: { visibility?: string; hostRole?: string } | null = submitted instanceof FormData ? parseForm(submitted, createRoomFormSchema) : {};
  if (!form) return;
  const visibility = isRoomVisibility(form.visibility) ? form.visibility : defaultRoomVisibility;
  const hostRole = parseHostRole(form.hostRole);
  const destination = { kind: 'create-room', visibility, hostRole } as const;
  await requireStarter(guest.id, destination);
  await requireNoOtherRoom(guest.id, destination);
  await redirectToNewRoom(guest.id, { visibility, hostRole });
}
