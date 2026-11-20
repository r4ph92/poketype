import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RaceHistoryPage } from '@/domain/race-history';
import { RaceHistoryPager } from './RaceHistoryPager';
import { RaceHistoryTable } from './RaceHistoryTable';

export async function RaceHistoryView({ history }: { history: RaceHistoryPage }) {
  const t = await getTranslations('RaceHistory');
  return (
    <PixelPanel titleId="race-history-title" level={1} title={t('title')}>
      {history.entries.length === 0 ? <EmptyHistory /> : <><TrendLink /><RaceHistoryTable entries={history.entries} /><RaceHistoryPager page={history.page} pageCount={history.pageCount} /></>}
    </PixelPanel>
  );
}

async function EmptyHistory() {
  const t = await getTranslations('RaceHistory');
  return (
    <DialogueBox>
      <p>{t('empty')}</p>
      <PixelLink href="/play/race" variant="primary">{t('startRace')}</PixelLink>
    </DialogueBox>
  );
}

async function TrendLink() {
  const t = await getTranslations('RaceHistory');
  return <p><Link href="/play/profile#profile-progression" className="race-history-link">{t('trendLink')}</Link></p>;
}
