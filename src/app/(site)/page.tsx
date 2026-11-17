import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { acceptsNewMembers } from '@/domain/room-phase';
import { hubDestination, pathOf, type StarterDestination } from '@/domain/starter-destination';
import { GuestNameForm } from '@/features/guest/GuestNameForm';
import { entryReturnDestination, entryReturnQuery } from '@/features/guest/entry-destination';
import { database } from '@/server/db/client';
import { findRoomAccess } from '@/server/rooms/room-access';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type HomePageProps = { searchParams: Promise<{ room?: string | string[]; invite?: string | string[] }> };

type HintKey = 'joinRoomHint' | 'inviteHint' | 'privateRoom';

export default async function HomePage({ searchParams }: HomePageProps) {
  const { room, invite } = await searchParams;
  const requested = entryReturnDestination({ returnRoomId: room, inviteToken: invite });
  if (await findCurrentGuest()) redirect(pathOf(requested));
  const t = await getTranslations('Home');
  const hint = await hintFor(requested);
  const returnTo = hint === 'privateRoom' ? hubDestination : requested;
  return (
    <PageMain>
      <PixelPanel titleId="home-title" level={1} title={t('title')}>
        <p className="max-w-[65ch]">{t('welcome')}</p>
      </PixelPanel>
      {hint && <EntryHint hint={hint} />}
      <GuestEntry returnTo={returnTo} />
    </PageMain>
  );
}

// A private room's link leads nowhere without an invitation, so the visitor is told so instead of being invited to choose a name for it.
async function hintFor(destination: StarterDestination): Promise<HintKey | null> {
  if (destination.kind === 'invite') return 'inviteHint';
  if (destination.kind !== 'room') return null;
  const access = await findRoomAccess(database, destination.roomId);
  if (access?.visibility === 'private') return 'privateRoom';
  return acceptsNewMembers(access?.phase ?? null) ? 'joinRoomHint' : null;
}

async function EntryHint({ hint }: { hint: HintKey }) {
  const home = await getTranslations('Home');
  const invitations = await getTranslations('Invitations');
  return (
    <DialogueBox>
      <p>{hint === 'privateRoom' ? invitations('privateMessage') : home(hint)}</p>
    </DialogueBox>
  );
}

async function GuestEntry({ returnTo }: { returnTo: StarterDestination }) {
  const entry = await getTranslations('GuestEntry');
  const accountBar = await getTranslations('AccountBar');
  const play = await getTranslations('Play');
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
        returnTo={returnTo}
        findRaceLabel={returnTo.kind === 'hub' ? play('findRace') : undefined}
      />
      <p>
        {entry('haveAccount')}{' '}
        <Link href={`/login${entryReturnQuery(returnTo)}`} className="font-semibold underline">
          {accountBar('logIn')}
        </Link>
      </p>
    </PixelPanel>
  );
}
