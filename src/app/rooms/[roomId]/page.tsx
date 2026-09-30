import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CopyRoomLink } from '@/features/rooms/CopyRoomLink';
import { RaceAlreadyStarted } from '@/features/rooms/RaceAlreadyStarted';
import { RoomMemberList } from '@/features/rooms/RoomMemberList';
import type { RoomSnapshot } from '@/server/rooms/room-snapshot';
import { enterRoom } from './load-room';

type RoomPageProps = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const entry = await enterRoom((await params).roomId);
  const t = await getTranslations('Metadata');
  return { title: entry.kind === 'race-started' ? t('raceStartedTitle') : t('roomTitle') };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const entry = await enterRoom((await params).roomId);
  if (entry.kind === 'race-started') return <RaceAlreadyStarted />;
  return <WaitingRoom snapshot={entry.snapshot} />;
}

async function WaitingRoom({ snapshot }: { snapshot: RoomSnapshot }) {
  const t = await getTranslations('Room');
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('heading')}</h1>
      <p className="mt-4 font-bold">{t('playerCount', { count: snapshot.members.length })}</p>
      <RoomMemberList members={snapshot.members} />
      <p className="mt-4">{t('inviteHint')}</p>
      <CopyRoomLink
        copyLabel={t('copyLink')}
        copiedMessage={t('copied')}
        copyFailedMessage={t('copyFailed')}
        linkLabel={t('linkLabel')}
      />
    </main>
  );
}
