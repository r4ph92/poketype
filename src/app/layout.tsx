import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { CookieConsentDialog } from '@/features/consent/CookieConsentDialog';
import { readConsentLevel } from '@/features/consent/consent-cookie';
import { LocaleSync } from '@/features/locale/LocaleSync';
import { SiteFooter } from '@/components/SiteFooter';
import { prePaintThemeScript } from '@/features/theme/pre-paint-script';
import { fontVariables } from './fonts';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('title'), description: t('description') };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const { ServerError, Footer, Animation, CookieConsent } = await getMessages();
  const consent = await readConsentLevel();
  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        {consent !== 'necessary' && <script dangerouslySetInnerHTML={{ __html: prePaintThemeScript }} />}
      </head>
      <body className="flex min-h-screen flex-col">
        <LocaleSync locale={locale} />
        <NextIntlClientProvider locale={locale} messages={{ ServerError, Footer, Animation, CookieConsent }}>
          <div className="flex-1">{children}</div>
          <CookieConsentDialog level={consent} />
        </NextIntlClientProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
