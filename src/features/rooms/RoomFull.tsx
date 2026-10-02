import { getTranslations } from 'next-intl/server';
import { NoticePanel } from '@/components/pixel/NoticePanel';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelLink } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';

export async function RoomFull() {
  const t = await getTranslations('Room');
  return (
    <PageMain>
      <NoticePanel
        titleId="room-full-title"
        title={t('fullHeading')}
        message={t('fullMessage', { capacity: gameConfig.rooms.capacity })}
        action={<PixelLink href="/play/race">{t('toPublicRooms')}</PixelLink>}
      />
    </PageMain>
  );
}
