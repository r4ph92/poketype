import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { leadsToRoom } from '@/domain/room-switch';
import { encodeStarterDestination, parseStarterDestination, pathOf } from '@/domain/starter-destination';
import { SwitchRoomOffer } from '@/features/rooms/switch-room/SwitchRoomOffer';
import { database } from '@/server/db/client';
import { findCurrentRoom } from '@/server/rooms/current-room';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type SwitchRoomPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('switchRoomTitle') };
}

// Nothing left to leave (the room closed meanwhile) or the same room: the player simply goes on where they were going.
export default async function SwitchRoomPage({ searchParams }: SwitchRoomPageProps) {
  const guest = await findCurrentGuest();
  if (!guest) redirect('/');
  const destination = parseStarterDestination((await searchParams).next);
  const current = await findCurrentRoom(database, guest.id, new Date());
  if (current === null || leadsToRoom(destination, current.roomId)) redirect(pathOf(destination));
  return <SwitchRoomOffer current={current} next={encodeStarterDestination(destination)} />;
}
