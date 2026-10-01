import { getTranslations } from 'next-intl/server';
import { DialogueBox } from '@/components/pixel/DialogueBox';

export async function SignUpNotice() {
  const t = await getTranslations('SignUp');
  return (
    <section aria-labelledby="signup-notice-heading">
      <DialogueBox
        heading={
          <h2 id="signup-notice-heading" className="font-pixel text-lg font-bold uppercase tracking-[0.06em]">
            {t('noticeHeading')}
          </h2>
        }
      >
        <p>{t('noticeNoEmail')}</p>
        <p className="font-bold">{t('noticeNoRecovery')}</p>
        <p>{t('noticeWriteDown')}</p>
      </DialogueBox>
    </section>
  );
}
