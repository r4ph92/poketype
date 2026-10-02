import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { hubDestination } from '@/domain/starter-destination';
import { requireStarter } from '@/features/trainer/starter-gate';
import { findCurrentSession } from '@/server/sessions/current-session';

// The hub shows the player's partner everywhere, so it opens only once a starter is chosen; the starter screen lives outside this group.
export default async function HubLayout({ children }: { children: ReactNode }) {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  await requireStarter(session.guest.id, hubDestination);
  return children;
}
