import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { LocaleSync } from '@/features/locale/LocaleSync';
import { SiteFooter } from '@/components/SiteFooter';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('title'), description: t('description') };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const { ServerError, Footer } = await getMessages();
  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col bg-cream text-ink">
        <LocaleSync locale={locale} />
        <NextIntlClientProvider locale={locale} messages={{ ServerError, Footer }}>
          <div className="flex-1">{children}</div>
        </NextIntlClientProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
