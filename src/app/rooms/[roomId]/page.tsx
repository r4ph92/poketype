import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('heading')}</h1>
      <p className="mt-4 font-bold">{t('playerCount', { count: snapshot.members.length })}</p>
      <section aria-labelledby="players-heading" className="mt-6 border-4 border-ink bg-white p-4">
        <h2 id="players-heading" className="font-bold">
          {t('playersHeading')}
        </h2>
        <ul className="mt-2 space-y-2">
          {snapshot.members.map((member) => (
            <li key={member.memberKey} className="flex flex-wrap items-center gap-2">
              <span className="wrap-anywhere">{member.trainerName}</span>
              {member.isHost && <span className="border-2 border-ink bg-gold px-2 text-sm font-bold">{t('hostBadge')}</span>}
              {member.isViewer && <span className="border-2 border-ink bg-cream px-2 text-sm font-bold">{t('youMarker')}</span>}
            </li>
          ))}
        </ul>
      </section>
      <CopyRoomLink
        copyLabel={t('copyLink')}
        copiedMessage={t('copied')}
        copyFailedMessage={t('copyFailed')}
        linkLabel={t('linkLabel')}
      />
    </main>
  );
}
