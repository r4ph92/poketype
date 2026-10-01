'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { RaceResultRow, RoomMemberView } from '@/domain/room-view';
import { useFocusedHeading } from '@/features/rooms/use-focused-heading';
import { resultsTableRows } from './results-table';
import { ResultsTable } from './ResultsTable';

type RaceResultsViewProps = { results: RaceResultRow[]; members: RoomMemberView[] };

export function RaceResultsView({ results, members }: RaceResultsViewProps) {
  const t = useTranslations('Room');
  const headingRef = useFocusedHeading(useTranslations('Metadata')('resultsTitle'));
  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold">
        {t('resultsHeading')}
      </h1>
      <ResultsTable rows={resultsTableRows(results, members)} />
      <Link href="/play" className="mt-6 inline-flex min-h-11 items-center underline">
        {t('backToPlay')}
      </Link>
    </>
  );
}
