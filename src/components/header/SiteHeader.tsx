import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { BallIcon, RaceFlagIcon } from '@/components/pixel/icons/icons';
import { AccountNav } from '@/features/account/AccountNav';
import { LocaleSwitch } from '@/features/locale/LocaleSwitch';
import { NavTab } from './NavTab';

const raceTabPaths = ['/play', '/rooms/'] as const;

async function Wordmark() {
  const t = await getTranslations('Header');
  return (
    <div className="basis-full lg:basis-auto">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-pixel text-xl font-bold uppercase">
        <BallIcon />
        {t('wordmark')}
      </Link>
    </div>
  );
}

async function SiteNav() {
  const t = await getTranslations('Header');
  return (
    <nav aria-label={t('navLabel')} className="flex min-w-0 flex-wrap gap-2">
      <NavTab href="/play" activePaths={raceTabPaths} icon={<RaceFlagIcon />} label={t('tabs.race')} />
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-[90rem] px-4 pt-4">
      <div className="pixel-frame pixel-notch flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Wordmark />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <SiteNav />
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 lg:ms-auto">
            <LocaleSwitch />
            <AccountNav />
          </div>
        </div>
      </div>
    </header>
  );
}
