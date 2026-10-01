import { getTranslations } from 'next-intl/server';
import { BallIcon, RaceFlagIcon, UserIcon } from '@/components/pixel/icons/icons';
import { NavTab } from './NavTab';

export async function SiteNav() {
  const t = await getTranslations('Header');
  return (
    <nav aria-label={t('navLabel')} className="flex min-w-0 flex-wrap gap-2">
      <NavTab href="/play" activePaths={['/play', '/play/achievements']} icon={<UserIcon />} label={t('tabs.trainer')} />
      <NavTab href="/play/race" activePaths={['/play/race', '/rooms/']} icon={<RaceFlagIcon />} label={t('tabs.race')} />
      <NavTab href="/play/collection" activePaths={['/play/collection', '/play/pokedex']} icon={<BallIcon />} label={t('tabs.collection')} />
      <NavTab href="/play/routes" activePaths={['/play/routes']} icon={<RaceFlagIcon />} label={t('tabs.routes')} />
    </nav>
  );
}

