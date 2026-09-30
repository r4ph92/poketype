import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { gameConfig } from '@/config/game';
import { parseRoomId, type RoomId } from '@/domain/room-id';
import { GuestNameForm } from '@/features/guest/GuestNameForm';
import { destinationAfterEntry } from '@/features/guest/entry-destination';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type HomePageProps = { searchParams: Promise<{ room?: string | string[] }> };

export default async function HomePage({ searchParams }: HomePageProps) {
  const returnRoomId = parseRoomId((await searchParams).room);
  if (await findCurrentGuest()) redirect(destinationAfterEntry(returnRoomId));
  const t = await getTranslations('Home');
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-lg">{t('welcome')}</p>
      <GuestEntry returnRoomId={returnRoomId} />
    </main>
  );
}

async function GuestEntry({ returnRoomId }: { returnRoomId: RoomId | null }) {
  const t = await getTranslations('Home');
  const entry = await getTranslations('GuestEntry');
  const limits = gameConfig.trainerName;
  return (
    <>
      <h2 className="mt-8 text-2xl font-bold">{entry('heading')}</h2>
      {returnRoomId && <p className="mt-4 border-4 border-ink bg-white p-3 font-bold">{t('joinRoomHint')}</p>}
      <GuestNameForm
        label={entry('label')}
        hint={entry('hint', { min: limits.minLength, max: limits.maxLength })}
        submitLabel={entry('submit')}
        errors={{
          required: entry('errors.required'),
          length: entry('errors.length', { min: limits.minLength, max: limits.maxLength }),
          characters: entry('errors.characters'),
        }}
        returnRoomId={returnRoomId}
      />
    </>
  );
}
