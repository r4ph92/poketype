'use client';

import { useState } from 'react';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { racerSpecies } from '@/domain/racer-appearance';
import { useFormatter, useTranslations } from 'next-intl';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { formatFinishSeconds, formatWholeNumber, wholePercent } from './race-number-format';
import type { ResultsTableRow } from './results-table';

type ResultsTableProps = { rows: ResultsTableRow[] };

const headerCell = 'px-1.5 py-2 font-pixel font-semibold uppercase whitespace-nowrap';
const numberHeaderCell = `${headerCell} text-right`;
const numberCell = 'px-1.5 py-2 text-right whitespace-nowrap tabular-nums';

const rowClass = {
  viewer: 'border-b-2 border-slate bg-gold text-on-gold',
  other: 'border-b-2 border-slate',
} as const;

// Tight cells and untracked headers fit seven columns in the page column; the standings scroll sideways on a narrow screen,
// and the region is focusable so the keyboard can scroll it.
export function ResultsTable({ rows }: ResultsTableProps) {
  const t = useTranslations('Room');
  const [detailed, setDetailed] = useState(false);
  return (
    <>
    <div className="results-table-heading"><h2 className="font-pixel font-bold">{t('resultsCaption')}</h2><button type="button" aria-expanded={detailed} aria-controls="race-standings" onClick={() => setDetailed(!detailed)} className="min-h-11 underline text-sm">{t(detailed ? 'hideRaceDetails' : 'showRaceDetails')}</button></div>
    <div role="region" aria-labelledby="results-caption" tabIndex={0} className="min-w-0 overflow-x-auto">
      <table id="race-standings" data-detailed={detailed} className="results-table w-full [border-collapse:collapse] text-left text-sm">
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
            <th scope="col" hidden={!detailed} className={numberHeaderCell}>
              {t('scoreColumn')}
            </th>
            <th scope="col" className={numberHeaderCell}>
              {t('accuracyColumn')}
            </th>
            <th scope="col" hidden={!detailed} className={numberHeaderCell}>
              {t('errorsColumn')}
            </th>
            <th scope="col" hidden={!detailed} className={numberHeaderCell}>
              {t('timeColumn')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ResultRow key={row.memberKey} row={row} detailed={detailed} />
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

// Gold marks the viewer's own row, always with the "Toi" badge so colour is never the only cue.
function ResultRow({ row, detailed }: { row: ResultsTableRow; detailed: boolean }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  return (
    <tr className={rowClass[row.isViewer ? 'viewer' : 'other']}>
      <td className={`${numberCell} font-bold`}><span className="results-rank" data-rank={row.place}>{format.number(row.place)}</span></td>
      <th scope="row" className="px-1.5 py-2 text-left font-normal whitespace-nowrap">
        <PokemonSprite species={racerSpecies(row.memberKey)} scale={1} animated={false} />
        <span data-trainer-name>{row.trainerName}</span>
        {row.isViewer && (
          <span className="ms-2 inline-block align-middle">
            <ProgressBadge variant="you">{t('youMarker')}</ProgressBadge>
          </span>
        )}
      </th>
      <td className={numberCell}>{formatWholeNumber(format, row.grossWpm)}</td>
      <td hidden={!detailed} className={numberCell}>{formatWholeNumber(format, row.score)}</td>
      <td className={numberCell}>{t('progressPercent', { percent: wholePercent(row.accuracy) })}</td>
      <td hidden={!detailed} className={numberCell}>{format.number(row.errors)}</td>
      <td hidden={!detailed} className={numberCell}>{t('finishTime', { seconds: formatFinishSeconds(format, row.finishMs) })}</td>
    </tr>
  );
}
