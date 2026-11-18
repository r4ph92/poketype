import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NoticePanel } from '@/components/pixel/NoticePanel';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelLink } from '@/components/pixel/PixelButton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('pastRaceNotFoundTitle') };
}

export default async function PastRaceNotFoundPage() {
  const t = await getTranslations('PastRace');
  return (
    <PageMain>
      <NoticePanel titleId="past-race-not-found-title" title={t('notFoundHeading')} message={t('notFoundMessage')} action={<PixelLink href="/play">{t('backToPlay')}</PixelLink>} />
    </PageMain>
  );
}
