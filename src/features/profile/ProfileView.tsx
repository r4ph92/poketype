import { getTranslations } from 'next-intl/server';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { ProfileSummary } from '@/domain/profile-stats';
import { DisplayNamePanel } from './DisplayNamePanel';
import { ProfileStatsList } from './ProfileStatsList';
import { ProgressionPanel } from './ProgressionPanel';

type ProfileViewProps = { summary: ProfileSummary; displayName: string; username: string };

export async function ProfileView({ summary, displayName, username }: ProfileViewProps) {
  const t = await getTranslations('Profile');
  return (
    <div className="profile-layout">
      <div className="grid gap-4">
        <PixelPanel titleId="profile-title" level={1} title={t('title')}>
          <ProfileStatsList stats={summary.stats} />
          <p className="text-sm text-muted">{t('statsRule')}</p>
        </PixelPanel>
        <DisplayNamePanel displayName={displayName} username={username} />
      </div>
      <ProgressionPanel progression={summary.progression} />
    </div>
  );
}
