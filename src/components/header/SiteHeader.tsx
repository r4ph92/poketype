import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { BallIcon } from '@/components/pixel/icons/icons';
import { AccountNav } from '@/features/account/AccountNav';
import { readHeaderSession, showsGameNavigation } from '@/features/account/header-session';
import { CookieSettingsButton } from '@/features/consent/CookieSettingsButton';
import { LocaleSwitch } from '@/features/locale/LocaleSwitch';
import { ThemeSwitch } from '@/features/theme/ThemeSwitch';
import { SiteNav } from './SiteNav';
import { SettingsSheet } from './SettingsSheet';

async function Wordmark() {
  const t = await getTranslations('Header');
  return (
    <div className="header-brand">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-pixel text-display font-bold uppercase">
        <BallIcon />
        {t('wordmark')}
      </Link>
    </div>
  );
}

export async function SiteHeader() {
  const t = await getTranslations('Header');
  const consent = await getTranslations('CookieConsent');
  const session = await readHeaderSession();
  return (
    <header className="mx-auto w-full max-w-[90rem] px-4 pt-4">
      <div className="pixel-frame pixel-notch header-layout">
        <Wordmark />
        {showsGameNavigation(session) && <div className="header-navigation"><SiteNav /></div>}
        <div className="header-account">
          <AccountNav header={session} />
          <SettingsSheet title={t('settings')} closeLabel={t('closeSettings')}>
            <div className="grid gap-4">
              <ThemeSwitch />
              <LocaleSwitch />
              <CookieSettingsButton label={consent('manage')} className="min-h-11 justify-self-start font-pixel font-semibold underline" />
            </div>
          </SettingsSheet>
        </div>
        <noscript><LocaleSwitch /></noscript>
      </div>
    </header>
  );
}
