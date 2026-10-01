import { getMessages, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { AchievementsView } from '@/features/trainer/AchievementsView';
export async function generateMetadata() { const t = await getTranslations('Achievements'); return { title: t('title') }; }
export default async function AchievementsPage() {
  const { Achievements, Pokemon, Trainer } = await getMessages();
  return <NextIntlClientProvider messages={{ Achievements, Pokemon, Trainer }}><AchievementsView /></NextIntlClientProvider>;
}
