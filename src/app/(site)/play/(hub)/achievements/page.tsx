import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { AchievementsView } from '@/features/trainer/AchievementsView';
import { findCurrentTrainer } from '@/features/trainer/current-trainer';
import { ownedDexesOf } from '@/features/trainer/trainer-hub-view';
export async function generateMetadata() { const t = await getTranslations('Achievements'); return { title: t('title') }; }
export default async function AchievementsPage() {
  const { Achievements, Pokemon, Trainer } = await getMessages();
  const { profile } = await findCurrentTrainer();
  return <NextIntlClientProvider messages={{ Achievements, Pokemon, Trainer }}><AchievementsView metrics={profile.achievements} ownedDexes={ownedDexesOf(profile)} /></NextIntlClientProvider>;
}
