'use client';

import { useTranslations } from 'next-intl';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RaceResultRow, RoomMemberView } from '@/domain/room-view';
import { useFocusedHeading } from '@/features/rooms/use-focused-heading';
import { resultsTableRows } from './results-table';
import { ResultsTable } from './ResultsTable';

type RaceResultsViewProps = { results: RaceResultRow[]; members: RoomMemberView[] };

export function RaceResultsView({ results, members }: RaceResultsViewProps) {
  const t = useTranslations('Room');
  const headingRef = useFocusedHeading(useTranslations('Metadata')('resultsTitle'));
  return (
    <PixelPanel titleId="results-title" level={1} title={t('resultsHeading')} headingRef={headingRef}>
      <ResultsTable rows={resultsTableRows(results, members)} />
      <PixelLink href="/play">{t('backToPlay')}</PixelLink>
    </PixelPanel>
  );
}
