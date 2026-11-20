'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { formatWholeNumber, missingValueDash } from '../race-number-format';
import { timelineMoments, type WpmLine } from './wpm-lines';

const millisecondsPerSecond = 1000;

const captionId = 'race-wpm-caption';

type Formatter = ReturnType<typeof useFormatter>;

type LineValues = { line: WpmLine; wpmByMoment: ReadonlyMap<number, number>; stopMs: number };

// The same points as the chart, one row per moment any racer has one: the whole seconds and each racer's stop.
// A cell is blank between a racer's samples (another racer's stop) and a dash once they have stopped.
// On a narrow screen the table scrolls sideways in its own frame, focusable so the keyboard can scroll it.
export function RaceWpmTable({ lines }: { lines: readonly WpmLine[] }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  const columns = lines.map(valuesOf);
  return (
    <div role="region" aria-labelledby={captionId} tabIndex={0} className="min-w-0 overflow-x-auto">
      <table className="race-history-table">
        <caption id={captionId} className="sr-only">{t('wpmTimelineCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('wpmTimelineTimeColumn')}</th>
            {lines.map((line) => <th key={line.memberKey} scope="col">{line.isViewer ? t('wpmTimelineViewerColumn', { name: line.trainerName }) : line.trainerName}</th>)}
          </tr>
        </thead>
        <tbody>
          {timelineMoments(lines).map((elapsedMs) => (
            <tr key={elapsedMs}>
              <th scope="row">{format.number(elapsedMs / millisecondsPerSecond, { maximumFractionDigits: 1 })}</th>
              {columns.map((column) => <td key={column.line.memberKey}>{cellOf(column, elapsedMs, format)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function valuesOf(line: WpmLine): LineValues {
  return { line, wpmByMoment: new Map(line.points.map((point) => [point.elapsedMs, point.wpm])), stopMs: line.points.at(-1)?.elapsedMs ?? 0 };
}

function cellOf({ wpmByMoment, stopMs }: LineValues, elapsedMs: number, format: Formatter): string {
  const wpm = wpmByMoment.get(elapsedMs);
  if (wpm !== undefined) return formatWholeNumber(format, wpm);
  return elapsedMs > stopMs ? missingValueDash : '';
}
