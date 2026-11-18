import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AccountInvitation } from '@/features/account/AccountInvitation';
import { ProfileView } from '@/features/profile/ProfileView';
import { database } from '@/server/db/client';
import { findCurrentSession } from '@/server/sessions/current-session';
import { loadProfileSummary } from '@/server/trainer/profile-stats';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Profile');
  return { title: t('title') };
}

// The profile is read from the session's own guest identity; no parameter names another account.
export default async function ProfilePage() {
  const session = await findCurrentSession();
  const t = await getTranslations('Profile');
  if (!session?.account) return <AccountInvitation titleId="profile-title" title={t('title')} message={t('guestInvitation')} />;
  return <ProfileView summary={await loadProfileSummary(database, session.guest.id)} />;
}
