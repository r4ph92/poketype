import { getTranslations } from 'next-intl/server';
import { NoticePanel } from '@/components/pixel/NoticePanel';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelLink } from '@/components/pixel/PixelButton';

export async function RoomBanned() {
  const t = await getTranslations('Room');
  return (
    <PageMain>
      <NoticePanel
        titleId="room-banned-title"
        title={t('bannedHeading')}
        message={t('bannedMessage')}
        action={<PixelLink href="/play/race">{t('toPublicRooms')}</PixelLink>}
      />
    </PageMain>
  );
}
