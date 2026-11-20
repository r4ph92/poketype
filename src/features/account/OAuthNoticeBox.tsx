import { getTranslations } from 'next-intl/server';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import type { OAuthNotice } from '@/domain/oauth-notice';

// Cancelling is the player's own choice, so it is a calm status; the other notices are errors.
export async function OAuthNoticeBox({ notice }: { notice: OAuthNotice }) {
  const t = await getTranslations('OAuth.notices');
  const isCancelled = notice === 'cancelled';
  return (
    <DialogueBox tone={isCancelled ? 'info' : 'error'} live={isCancelled ? 'status' : 'alert'}>
      <p>{t(notice)}</p>
    </DialogueBox>
  );
}
