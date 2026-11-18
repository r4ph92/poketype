import { getTranslations } from 'next-intl/server';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { ProfileSummary } from '@/domain/profile-stats';
import { ProfileStatsList } from './ProfileStatsList';
import { ProgressionPanel } from './ProgressionPanel';

export async function ProfileView({ summary }: { summary: ProfileSummary }) {
  const t = await getTranslations('Profile');
  return (
    <div className="profile-layout">
      <PixelPanel titleId="profile-title" level={1} title={t('title')}>
        <ProfileStatsList stats={summary.stats} />
        <p className="text-sm text-muted">{t('statsRule')}</p>
      </PixelPanel>
      <ProgressionPanel progression={summary.progression} />
    </div>
  );
}
