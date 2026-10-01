'use client';

import { useTranslations } from 'next-intl';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { useFocusedHeading } from './use-focused-heading';

export function GoneRoomNotice() {
  const t = useTranslations('Room');
  const headingRef = useFocusedHeading(useTranslations('Metadata')('roomNotFoundTitle'));
  return (
    <PixelPanel titleId="room-gone-title" level={1} title={t('gone')} headingRef={headingRef}>
      <PixelLink href="/play">{t('backToPlay')}</PixelLink>
    </PixelPanel>
  );
}
