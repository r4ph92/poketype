import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';

type AccountInvitationProps = { titleId: string; title: string; message: string };

// A page that only an account can fill shows guests why, with the ways to get an account.
export async function AccountInvitation({ titleId, title, message }: AccountInvitationProps) {
  const accountBar = await getTranslations('AccountBar');
  return (
    <PixelPanel titleId={titleId} level={1} title={title}>
      <DialogueBox>
        <p>{message}</p>
        <PixelLink href="/signup" variant="primary">{accountBar('signUp')}</PixelLink>
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline">{accountBar('logIn')}</Link>
      </DialogueBox>
    </PixelPanel>
  );
}
