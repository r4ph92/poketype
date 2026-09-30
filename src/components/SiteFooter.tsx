import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/config';

async function FooterNotice({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Footer' });
  return (
    <div lang={locale} className="space-y-1">
      <p>{t('notice')}</p>
      <p>{t('rights')}</p>
      <p>{t('affiliation')}</p>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="space-y-4 border-t-4 border-ink bg-sage px-4 py-6 text-sm">
      <FooterNotice locale="fr" />
      <FooterNotice locale="en" />
    </footer>
  );
}
