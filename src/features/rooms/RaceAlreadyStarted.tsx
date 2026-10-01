import { getTranslations } from 'next-intl/server';
import { NoticePanel } from '@/components/pixel/NoticePanel';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelLink } from '@/components/pixel/PixelButton';

export async function RaceAlreadyStarted() {
  const t = await getTranslations('Room');
  return (
    <PageMain>
      <NoticePanel
        titleId="race-started-title"
        title={t('raceStartedHeading')}
        message={t('raceStartedMessage')}
        action={<PixelLink href="/play">{t('backToPlay')}</PixelLink>}
      />
    </PageMain>
  );
}
