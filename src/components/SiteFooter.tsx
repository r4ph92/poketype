import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FooterLayout, type FooterNotice } from './FooterLayout';
import { CookieSettingsButton } from '@/features/consent/CookieSettingsButton';
import type { Locale } from '@/i18n/config';

async function footerNotice(locale: Locale): Promise<FooterNotice> {
  const t = await getTranslations({ locale, namespace: 'Footer' });
  return { locale, lines: [t('notice'), t('rights'), t('affiliation')] };
}

export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const consent = await getTranslations('CookieConsent');
  return (
    <FooterLayout notices={[await footerNotice('fr'), await footerNotice('en')]}>
      <div className="flex flex-wrap items-center gap-x-6">
        <Link href="/credits" className="inline-flex min-h-11 items-center underline">{t('credits')}</Link>
        <CookieSettingsButton label={consent('manage')} className="inline-flex min-h-11 items-center underline" />
      </div>
    </FooterLayout>
  );
}
