'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { formatFinishSeconds, formatWholeNumber, wholePercent } from './race-number-format';
import type { ResultsTableRow } from './results-table';

type ResultsTableProps = { rows: ResultsTableRow[] };

const headerCell = 'px-2 py-2 font-pixel font-semibold uppercase tracking-[0.06em] whitespace-nowrap';
const numberHeaderCell = `${headerCell} text-right`;
const numberCell = 'px-2 py-2 text-right whitespace-nowrap tabular-nums';

const rowClass = {
  viewer: 'border-b-2 border-slate bg-gold text-on-gold',
  other: 'border-b-2 border-slate',
} as const;

// The standings scroll sideways inside their panel on a narrow screen; the region is focusable so the keyboard can scroll it.
export function ResultsTable({ rows }: ResultsTableProps) {
  const t = useTranslations('Room');
  return (
    <div role="region" aria-labelledby="results-caption" tabIndex={0} className="min-w-0 overflow-x-auto">
      <table className="w-full [border-collapse:collapse] text-left text-sm">
        <caption id="results-caption" className="sr-only">
          {t('resultsCaption')}
        </caption>
        <thead>
          <tr className="border-b-2 border-frame bg-cream-deep">
            <th scope="col" className={numberHeaderCell}>
              {t('placeColumn')}
            </th>
            <th scope="col" className={headerCell}>
              {t('trainerColumn')}
            </th>
            <th scope="col" className={numberHeaderCell}>
              <abbr title={t('wpmMeaning')}>{t('wpmColumn')}</abbr>
            </th>
            <th scope="col" className={numberHeaderCell}>
              {t('scoreColumn')}
            </th>
            <th scope="col" className={numberHeaderCell}>
              {t('accuracyColumn')}
            </th>
            <th scope="col" className={numberHeaderCell}>
              {t('errorsColumn')}
            </th>
            <th scope="col" className={numberHeaderCell}>
              {t('timeColumn')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ResultRow key={row.memberKey} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Gold marks the viewer's own row, always with the "Toi" badge so colour is never the only cue.
function ResultRow({ row }: { row: ResultsTableRow }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  return (
    <tr className={rowClass[row.isViewer ? 'viewer' : 'other']}>
      <td className={`${numberCell} font-bold`}>{format.number(row.place)}</td>
      <th scope="row" className="px-2 py-2 text-left font-normal whitespace-nowrap">
        <span>{row.trainerName}</span>
        {row.isViewer && (
          <span className="ms-2 inline-block align-middle">
            <ProgressBadge variant="you">{t('youMarker')}</ProgressBadge>
          </span>
        )}
      </th>
      <td className={numberCell}>{formatWholeNumber(format, row.grossWpm)}</td>
      <td className={numberCell}>{formatWholeNumber(format, row.score)}</td>
      <td className={numberCell}>{t('progressPercent', { percent: wholePercent(row.accuracy) })}</td>
      <td className={numberCell}>{format.number(row.errors)}</td>
      <td className={numberCell}>{t('finishTime', { seconds: formatFinishSeconds(format, row.finishMs) })}</td>
    </tr>
  );
}
