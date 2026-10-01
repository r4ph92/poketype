'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useFocusedHeading } from './use-focused-heading';

export function GoneRoomNotice() {
  const t = useTranslations('Room');
  const headingRef = useFocusedHeading(useTranslations('Metadata')('roomNotFoundTitle'));
  return (
    <div className="mt-6 border-4 border-ink bg-white p-4">
      <h1 ref={headingRef} tabIndex={-1} className="text-xl font-bold">
        {t('gone')}
      </h1>
      <Link href="/play" className="mt-2 inline-flex min-h-11 items-center underline">
        {t('backToPlay')}
      </Link>
    </div>
  );
}
