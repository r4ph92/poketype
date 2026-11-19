'use client';

import { PlayerAvatar } from '@/components/pixel/PlayerAvatar';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { spriteBoxes } from '@/components/pixel/sprite-boxes';
import { useFormatter, useTranslations } from 'next-intl';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import { accuracyPercent, formatOptionalWholeNumber, formatWholeNumber } from './race-number-format';
import { ResultTime } from './ResultTime';
import { isRanked, statusOf, type RankedTableRow, type ResultStatus, type ResultsTableRow } from './results-table';

type ResultsTableProps = { rows: ResultsTableRow[] };

const headerCell = 'px-1 py-2 font-pixel font-semibold uppercase';
const numberHeaderCell = `${headerCell} text-right`;
const numberCell = 'px-1 py-2 text-right whitespace-nowrap tabular-nums';

const dash = '\u2014';

const rowClass = {
  viewer: 'border-b-2 border-slate bg-gold text-on-gold',
  other: 'border-b-2 border-slate',
} as const;

// Every column is always visible; on a narrow screen the standings scroll sideways inside their own frame,
// and the region is focusable so the keyboard can scroll it.
export function ResultsTable({ rows }: ResultsTableProps) {
  const t = useTranslations('Room');
  return (
    <>
    <div className="results-table-heading"><h2 className="font-pixel font-bold">{t('resultsCaption')}</h2></div>
    <div role="region" aria-labelledby="results-caption" tabIndex={0} className="min-w-0 overflow-x-auto">
      <table id="race-standings" className="results-table w-full [border-collapse:collapse] text-left text-sm">
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
              <abbr title={t('rawWpmMeaning')}>{t('rawWpmColumn')}</abbr>
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
            <th scope="col" className={headerCell}>
              {t('statusColumn')}
            </th>
            <th scope="col" className={headerCell}>
              {t('bonusColumn')}
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
    </>
  );
}

// Gold marks the viewer's own row, always with the "Toi" badge so colour is never the only cue.
function ResultRow({ row }: { row: ResultsTableRow }) {
  const t = useTranslations('Room');
  const bots = useTranslations('Bots');
  const format = useFormatter();
  return (
    <tr className={rowClass[row.isViewer ? 'viewer' : 'other']}>
      <td className={`${numberCell} font-bold`}>{isRanked(row) ? <span className="results-rank" data-rank={row.place}>{format.number(row.place)}</span> : dash}</td>
      <th scope="row" className="px-1 py-2 text-left font-normal min-w-48 sm:min-w-56">
        <div className="flex items-center gap-2">
          <PlayerAvatar seed={row.avatarSeed} />
          {row.partner && (
            <span className="hidden shrink-0 sm:block">
              <PokemonSprite species={row.partner} box={spriteBoxes.resultsRow} animated={false} />
            </span>
          )}
          <div className="min-w-0">
            <span data-trainer-name className="[overflow-wrap:anywhere]">{row.trainerName}</span>
            <span className="ms-1 inline-flex flex-wrap gap-1 align-middle">
              {row.bot && <ProgressBadge>{bots('botTag')}</ProgressBadge>}
              {row.isViewer && <ProgressBadge variant="you">{t('youMarker')}</ProgressBadge>}
            </span>
          </div>
        </div>
      </th>
      {isRanked(row) ? <RankedCells row={row} /> : <UnrankedCells errors={row.errors} />}
      <StatusCell status={statusOf(row)} />
      <td data-bonuses className="px-1 py-2 whitespace-nowrap">{dash}</td>
    </tr>
  );
}

function RankedCells({ row }: { row: RankedTableRow }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  return (
    <>
      <td className={numberCell}>{formatWholeNumber(format, row.grossWpm)}</td>
      <td className={numberCell}>{formatOptionalWholeNumber(format, row.rawWpm)}</td>
      <td className={numberCell}>{t('progressPercent', { percent: accuracyPercent(format, row.accuracy) })}</td>
      <td className={numberCell}>{format.number(row.errors)}</td>
      <td className={numberCell}><ResultTime finishMs={row.finishMs} /></td>
    </>
  );
}

// In a race settled before #136, an abandoned or inactive racer has no ranked metrics, so the row shows dashes.
function UnrankedCells({ errors }: { errors: number }) {
  const format = useFormatter();
  return (
    <>
      <td className={numberCell}>{dash}</td>
      <td className={numberCell}>{dash}</td>
      <td className={numberCell}>{dash}</td>
      <td className={numberCell}>{format.number(errors)}</td>
      <td className={numberCell}>{dash}</td>
    </>
  );
}

const statusLabel = { finished: 'finished', timedOut: 'timedOut', abandoned: 'abandoned' } as const satisfies Record<ResultStatus, string>;

// Terminé, Temps écoulé or Abandon (COURSE-10); a finisher's status is plain text, the other two stand out as badges.
function StatusCell({ status }: { status: ResultStatus }) {
  const t = useTranslations('Room');
  const label = t(statusLabel[status]);
  return <td data-status={status} className="px-1 py-2 whitespace-nowrap">{status === 'finished' ? label : <ProgressBadge>{label}</ProgressBadge>}</td>;
}
