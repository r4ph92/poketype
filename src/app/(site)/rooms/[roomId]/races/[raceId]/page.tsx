import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PageMain } from '@/components/pixel/PageMain';
import { parseRaceId } from '@/domain/race';
import { parseRoomId } from '@/domain/room-id';
import { withLocalBotNames } from '@/features/race/bot-names';
import { RaceResultsView } from '@/features/race/RaceResultsView';
import { ResultsExitLinks } from '@/features/race/ResultsExitLinks';
import { liveRoomMessageKeys, liveRoomMetadataKeys } from '@/features/rooms/live-room-messages';
import { resolveLocale } from '@/i18n/config';
import { pickMessages } from '@/i18n/pick-messages';
import { database } from '@/server/db/client';
import { findPastRaceResults, type PastRaceResults } from '@/server/rooms/past-race-results';
import { findCurrentGuest } from '@/server/sessions/current-guest';

type RaceResultsPageProps = { params: Promise<{ roomId: string; raceId: string }> };

// Reading a past race never joins the room. Anyone but its participants gets the same not-found page as an unknown address.
const loadPastRace = cache(async (rawRoomId: string, rawRaceId: string): Promise<PastRaceResults> => {
  const roomId = parseRoomId(rawRoomId);
  const raceId = parseRaceId(rawRaceId);
  const guest = await findCurrentGuest();
  if (!roomId || !raceId || !guest) notFound();
  const pastRace = await findPastRaceResults(database, { roomId, raceId, viewerGuestId: guest.id });
  if (!pastRace) notFound();
  return pastRace;
});

export async function generateMetadata({ params }: RaceResultsPageProps): Promise<Metadata> {
  const { roomId, raceId } = await params;
  await loadPastRace(roomId, raceId);
  const t = await getTranslations('Metadata');
  return { title: t('resultsTitle') };
}

export default async function RaceResultsPage({ params }: RaceResultsPageProps) {
  const { roomId, raceId } = await params;
  const { results, racers, reward, ...rewards } = await loadPastRace(roomId, raceId);
  const { Room, Pokemon, Animation, Bots, Metadata: metadataMessages } = await getMessages();
  const messages = { Animation, Pokemon, Bots: pickMessages(Bots, ['botTag']), Room: pickMessages(Room, liveRoomMessageKeys), Metadata: pickMessages(metadataMessages, liveRoomMetadataKeys) };
  const locale = await getLocale();
  return (
    <PageMain wide>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RaceResultsView results={results} racers={withLocalBotNames(racers, resolveLocale(locale))} rewards={{ xp: reward, ...rewards }} celebrate={false} actions={<ResultsExitLinks />} />
      </NextIntlClientProvider>
    </PageMain>
  );
}
