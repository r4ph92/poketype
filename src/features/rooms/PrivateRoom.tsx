import { getTranslations } from 'next-intl/server';
import { NoticePanel } from '@/components/pixel/NoticePanel';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelLink } from '@/components/pixel/PixelButton';

export async function PrivateRoom() {
  const t = await getTranslations('Invitations');
  const room = await getTranslations('Room');
  return (
    <PageMain>
      <NoticePanel
        titleId="private-room-title"
        title={t('privateHeading')}
        message={t('privateMessage')}
        action={<PixelLink href="/play">{room('backToPlay')}</PixelLink>}
      />
    </PageMain>
  );
}
