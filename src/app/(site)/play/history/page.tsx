import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { parsePageParam } from '@/domain/race-history';
import { GuestHistoryInvitation } from '@/features/history/GuestHistoryInvitation';
import { RaceHistoryView } from '@/features/history/RaceHistoryView';
import { database } from '@/server/db/client';
import { findCurrentSession } from '@/server/sessions/current-session';
import { findRaceHistoryPage } from '@/server/trainer/race-history';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('RaceHistory');
  return { title: t('title') };
}

type HistoryPageProps = { searchParams: Promise<{ page?: string | string[] }> };

// The history is read from the session's own guest identity; no parameter names another account.
export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const session = await findCurrentSession();
  if (!session?.account) return <GuestHistoryInvitation />;
  const requestedPage = parsePageParam((await searchParams).page);
  return <RaceHistoryView history={await findRaceHistoryPage(database, session.guest.id, requestedPage)} />;
}
