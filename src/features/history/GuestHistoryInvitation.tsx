import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';

// A guest's races end with their session, so there is no history to show: the page invites them to keep one with an account.
export async function GuestHistoryInvitation() {
  const t = await getTranslations('RaceHistory');
  const accountBar = await getTranslations('AccountBar');
  return (
    <PixelPanel titleId="race-history-title" level={1} title={t('title')}>
      <DialogueBox>
        <p>{t('guestInvitation')}</p>
        <PixelLink href="/signup" variant="primary">{accountBar('signUp')}</PixelLink>
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline">{accountBar('logIn')}</Link>
      </DialogueBox>
    </PixelPanel>
  );
}
