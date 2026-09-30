import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AccountBar } from '@/features/account/AccountBar';
import { RoomMemberList } from '@/features/rooms/RoomMemberList';
import { CopyRoomLink } from '@/features/rooms/CopyRoomLink';
import { loadRoomOrLeave } from './load-room';

type RoomPageProps = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  await loadRoomOrLeave((await params).roomId);
  const t = await getTranslations('Metadata');
  return { title: t('roomTitle') };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const snapshot = await loadRoomOrLeave((await params).roomId);
  const t = await getTranslations('Room');
  return (
    <>
      <AccountBar />
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
    </>
  );
}
