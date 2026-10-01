import { getTranslations } from 'next-intl/server';

export async function SignUpNotice() {
  const t = await getTranslations('SignUp');
  return (
    <section aria-labelledby="signup-notice-heading" className="mt-6 space-y-2 border-4 border-ink bg-cream p-4">
      <h2 id="signup-notice-heading" className="text-xl font-bold">
        {t('noticeHeading')}
      </h2>
      <p>{t('noticeNoEmail')}</p>
      <p className="font-bold">{t('noticeNoRecovery')}</p>
      <p>{t('noticeWriteDown')}</p>
    </section>
  );
}
