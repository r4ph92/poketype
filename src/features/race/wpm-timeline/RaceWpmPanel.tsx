'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RaceFlagIcon } from '@/components/pixel/icons/icons';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { ResultsTableRow } from '../results-table';
import { RaceWpmChart } from './RaceWpmChart';
import { RaceWpmTable } from './RaceWpmTable';
import type { WpmTimelinesState } from './use-race-wpm-timelines';
import { wpmLinesOf, type WpmLine } from './wpm-lines';

type RaceWpmPanelProps = { timelines: WpmTimelinesState; rows: readonly ResultsTableRow[] };

export function RaceWpmPanel({ timelines, rows }: RaceWpmPanelProps) {
  const t = useTranslations('Room');
  return (
    <PixelPanel titleId="race-wpm-title" title={<span className="results-panel-title"><RaceFlagIcon />{t('wpmTimelineHeading')}</span>}>
      <TimelinesContent timelines={timelines} rows={rows} />
    </PixelPanel>
  );
}

function TimelinesContent({ timelines, rows }: RaceWpmPanelProps) {
  const t = useTranslations('Room');
  if (timelines.kind === 'loading') return <p aria-busy="true">{t('wpmTimelineLoading')}</p>;
  if (timelines.kind === 'failed') return <LoadFailed retry={timelines.retry} />;
  const lines = timelines.kind === 'recorded' ? wpmLinesOf(rows, timelines.racers) : [];
  if (lines.length === 0) return <p>{t('wpmTimelineUnrecorded')}</p>;
  return <RecordedTimelines lines={lines} />;
}

function RecordedTimelines({ lines }: { lines: readonly WpmLine[] }) {
  const t = useTranslations('Room');
  const [isTableOpen, setIsTableOpen] = useState(false);
  return (
    <div className="race-wpm">
      <RaceWpmChart lines={lines} />
      <details className="wpm-data" onToggle={(event) => setIsTableOpen(event.currentTarget.open)}>
        <summary>{t('wpmTimelineShowData')}</summary>
        {isTableOpen && <RaceWpmTable lines={lines} />}
      </details>
    </div>
  );
}

function LoadFailed({ retry }: { retry: () => void }) {
  const t = useTranslations('Room');
  return (
    <div className="grid gap-3">
      <p role="alert">{t('wpmTimelineFailed')}</p>
      <PixelButton variant="secondary" onClick={retry}>{t('wpmTimelineRetry')}</PixelButton>
    </div>
  );
}
