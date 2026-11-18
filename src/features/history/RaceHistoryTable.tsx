import { getFormatter, getTranslations } from 'next-intl/server';
import type { RaceHistoryEntry } from '@/domain/race-history';
import { accuracyPercent, formatOptionalWholeNumber } from '@/features/race/race-number-format';
import { RacePlace } from '@/features/trainer/RacePlace';

export async function RaceHistoryTable({ entries }: { entries: readonly RaceHistoryEntry[] }) {
  const t = await getTranslations('RaceHistory');
  const trainer = await getTranslations('Trainer');
  return (
    <div className="overflow-x-auto">
      <table className="race-history-table">
        <caption className="sr-only">{t('title')}</caption>
        <thead><tr><th scope="col">{t('date')}</th><th scope="col">{t('place')}</th><th scope="col">{trainer('wpmLabel')}</th><th scope="col">{t('accuracy')}</th><th scope="col">{t('language')}</th></tr></thead>
        <tbody>{await Promise.all(entries.map((entry) => <RaceHistoryRow key={entry.raceId} entry={entry} />))}</tbody>
      </table>
    </div>
  );
}

async function RaceHistoryRow({ entry }: { entry: RaceHistoryEntry }) {
  const t = await getTranslations('RaceHistory');
  const format = await getFormatter();
  const noValue = (await getTranslations('Trainer'))('noValue');
  return (
    <tr>
      <th scope="row"><time dateTime={entry.endedAt.toISOString()}>{format.dateTime(entry.endedAt, { dateStyle: 'medium', timeStyle: 'short' })}</time></th>
      <td><RacePlace place={entry.place} isAbandoned={entry.isAbandoned} isInactive={entry.isInactive} /> {entry.place !== null && <span>{t('outOf', { count: entry.participantCount })}</span>}</td>
      <td>{formatOptionalWholeNumber(format, entry.grossWpm)}</td>
      <td>{entry.accuracy === null ? noValue : t('percent', { value: accuracyPercent(format, entry.accuracy) })}</td>
      <td>{t(`languages.${entry.textLanguage}`)}</td>
    </tr>
  );
}
