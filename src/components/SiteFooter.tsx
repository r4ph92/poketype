import { getTranslations } from 'next-intl/server';
import { FooterLayout, type FooterNotice } from './FooterLayout';
import type { Locale } from '@/i18n/config';

async function footerNotice(locale: Locale): Promise<FooterNotice> {
  const t = await getTranslations({ locale, namespace: 'Footer' });
  return { locale, lines: [t('notice'), t('rights'), t('affiliation')] };
}

export async function SiteFooter() {
  return <FooterLayout notices={[await footerNotice('fr'), await footerNotice('en')]} />;
}
