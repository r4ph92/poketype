import { getFormatter, getTranslations } from 'next-intl/server';
import type { WpmPoint } from '@/domain/profile-stats';
import { formatWholeNumber } from '@/features/race/race-number-format';

// The same races and values as the chart, for readers who cannot see it or want exact numbers.
export async function WpmTable({ progression }: { progression: readonly WpmPoint[] }) {
  const t = await getTranslations('Profile');
  const format = await getFormatter();
  return (
    <div className="overflow-x-auto">
      <table className="race-history-table">
        <caption className="sr-only">{t('tableCaption')}</caption>
        <thead><tr><th scope="col">{t('raceNumber')}</th><th scope="col">{t('date')}</th><th scope="col">{t('wpmAxis')}</th></tr></thead>
        <tbody>
          {progression.map((point, index) => (
            <tr key={point.raceId}>
              <th scope="row">{formatWholeNumber(format, index + 1)}</th>
              <td><time dateTime={point.endedAt.toISOString()}>{format.dateTime(point.endedAt, { dateStyle: 'medium', timeStyle: 'short' })}</time></td>
              <td>{formatWholeNumber(format, point.wpm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
