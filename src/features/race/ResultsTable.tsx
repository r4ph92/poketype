'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { formatFinishSeconds, formatWholeNumber, wholePercent } from './race-number-format';
import type { ResultsTableRow } from './results-table';

type ResultsTableProps = { rows: ResultsTableRow[] };

const headerCell = 'px-2 py-2 font-bold whitespace-nowrap';
const numberHeaderCell = `${headerCell} text-right`;
const numberCell = 'px-2 py-2 text-right whitespace-nowrap tabular-nums';

// The standings scroll sideways inside their frame on a narrow screen; the region is focusable so the keyboard can scroll it.
export function ResultsTable({ rows }: ResultsTableProps) {
  const t = useTranslations('Room');
  return (
    <div role="region" aria-labelledby="results-caption" tabIndex={0} className="mt-6 overflow-x-auto border-4 border-ink bg-white p-4">
      <table className="w-full border-collapse text-left font-mono">
        <caption id="results-caption" className="pb-2 text-left font-bold">
          {t('resultsCaption')}
        </caption>
        <thead>
          <tr className="border-b-2 border-ink">
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
    <tr className={row.isViewer ? 'bg-gold text-on-gold' : undefined}>
      <td className={numberCell}>{format.number(row.place)}</td>
      <th scope="row" className="px-2 py-2 text-left font-normal whitespace-nowrap">
        <span>{row.trainerName}</span>
        {row.isViewer && <span className="ml-2 border-2 border-ink bg-cream px-2 text-sm font-bold">{t('youMarker')}</span>}
      </th>
      <td className={numberCell}>{formatWholeNumber(format, row.grossWpm)}</td>
      <td className={numberCell}>{formatWholeNumber(format, row.score)}</td>
      <td className={numberCell}>{t('progressPercent', { percent: wholePercent(row.accuracy) })}</td>
      <td className={numberCell}>{format.number(row.errors)}</td>
      <td className={numberCell}>{t('finishTime', { seconds: formatFinishSeconds(format, row.finishMs) })}</td>
    </tr>
  );
}
