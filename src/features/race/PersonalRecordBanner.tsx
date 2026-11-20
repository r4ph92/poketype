'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { PersonalRecord } from '@/domain/personal-record';
import { formatWholeNumber } from './race-number-format';

export function PersonalRecordBanner({ record }: { record: PersonalRecord }) {
  const t = useTranslations('Room');
  const format = useFormatter();
  const wpm = formatWholeNumber(format, record.wpm);
  const text = record.kind === 'first' ? t('firstRecord', { wpm }) : t('newRecord', { wpm, previous: formatWholeNumber(format, record.previousWpm) });
  return <p className="results-record" data-personal-record={record.kind}>{text}</p>;
}
