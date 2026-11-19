import { getTranslations } from 'next-intl/server';
import { NoticePanel } from '@/components/pixel/NoticePanel';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelLink } from '@/components/pixel/PixelButton';

export type InvitationProblem = 'invalid' | 'used' | 'revoked' | 'room-closed';

const noticeKeys = {
  invalid: { title: 'invalidHeading', message: 'invalidMessage' },
  used: { title: 'usedHeading', message: 'usedMessage' },
  revoked: { title: 'revokedHeading', message: 'revokedMessage' },
  'room-closed': { title: 'closedHeading', message: 'closedMessage' },
} as const;

export async function InvitationRefused({ problem }: { problem: InvitationProblem }) {
  const t = await getTranslations('Invitations');
  const room = await getTranslations('Room');
  return (
    <PageMain>
      <NoticePanel
        titleId="invitation-refused-title"
        title={t(noticeKeys[problem].title)}
        message={t(noticeKeys[problem].message)}
        action={<PixelLink href="/play">{room('backToPlay')}</PixelLink>}
      />
    </PageMain>
  );
}
