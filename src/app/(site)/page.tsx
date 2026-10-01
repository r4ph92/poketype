import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { parseRoomId, type RoomId } from '@/domain/room-id';
import { acceptsNewMembers } from '@/domain/room-phase';
import { GuestNameForm } from '@/features/guest/GuestNameForm';
import { destinationAfterEntry } from '@/features/guest/entry-destination';
import { database } from '@/server/db/client';
import { findRoomPhase } from '@/server/rooms/room-snapshot';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type HomePageProps = { searchParams: Promise<{ room?: string | string[] }> };

export default async function HomePage({ searchParams }: HomePageProps) {
  const returnRoomId = parseRoomId((await searchParams).room);
  if (await findCurrentGuest()) redirect(destinationAfterEntry(returnRoomId));
  const t = await getTranslations('Home');
  const isInvitedToRoom = returnRoomId !== null && acceptsNewMembers(await findRoomPhase(database, returnRoomId));
  return (
    <PageMain>
      <PixelPanel titleId="home-title" level={1} title={t('title')}>
        <p className="max-w-[65ch]">{t('welcome')}</p>
      </PixelPanel>
      {isInvitedToRoom && (
        <DialogueBox>
          <p>{t('joinRoomHint')}</p>
        </DialogueBox>
      )}
      <GuestEntry returnRoomId={returnRoomId} />
    </PageMain>
  );
}

async function GuestEntry({ returnRoomId }: { returnRoomId: RoomId | null }) {
  const entry = await getTranslations('GuestEntry');
  const limits = gameConfig.trainerName;
  return (
    <PixelPanel titleId="guest-entry-title" title={entry('heading')}>
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
    </PixelPanel>
  );
}
