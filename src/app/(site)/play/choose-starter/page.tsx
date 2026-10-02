import { randomInt } from 'node:crypto';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { gameConfig } from '@/config/game';
import type { StarterDex } from '@/domain/starter';
import { encodeStarterDestination, parseStarterDestination, pathOf } from '@/domain/starter-destination';
import { ChooseStarterView } from '@/features/trainer/ChooseStarterView';
import { database } from '@/server/db/client';
import { findCurrentSession } from '@/server/sessions/current-session';
import { hasStarter } from '@/server/trainer/partner';

export async function generateMetadata() {
  const t = await getTranslations('ChooseStarter');
  return { title: t('title') };
}

type ChooseStarterPageProps = { searchParams: Promise<{ next?: string | string[] }> };

export default async function ChooseStarterPage({ searchParams }: ChooseStarterPageProps) {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  const destination = parseStarterDestination((await searchParams).next);
  if (await hasStarter(database, session.guest.id)) redirect(pathOf(destination));
  const { ChooseStarter } = await getMessages();
  return <NextIntlClientProvider messages={{ ChooseStarter }}><ChooseStarterView options={shuffledStarters()} next={encodeStarterDestination(destination)} /></NextIntlClientProvider>;
}

// Always offer every starter, in a shuffled presentation order.
function shuffledStarters(): StarterDex[] {
  const options: StarterDex[] = [...gameConfig.progression.starterDexes];
  for (let index = options.length - 1; index > 0; index--) {
    const swap = randomInt(index + 1);
    [options[index], options[swap]] = [options[swap]!, options[index]!];
  }
  return options;
}
