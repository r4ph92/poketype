import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { UserIcon } from '@/components/pixel/icons/icons';
import { NavTab, navTabFaceClass } from '@/components/header/NavTab';
import { PlayerAvatar } from '@/components/pixel/PlayerAvatar';
import { maxDisplayNameLength } from '@/config/game';
import { avatarSeedOfSession } from '@/server/accounts/avatar-seed';
import type { SessionIdentity } from '@/server/sessions/session-store';
import { EndSessionForm } from './EndSessionForm';
import type { HeaderSession } from './header-session';
import { SessionSync } from './SessionSync';

const signUpPaths = ['/signup'] as const;
const logInPaths = ['/login'] as const;

function identityKey(session: SessionIdentity | null): string {
  if (!session) return 'visitor';
  return session.account ? `account:${session.account.username}` : 'guest';
}

async function AccountIdentity({ displayName, avatarSeed }: { displayName: string; avatarSeed: number }) {
  const t = await getTranslations('AccountBar');
  const label = t('account', { username: displayName });
  const prefixLength = t('account', { username: '' }).length;
  const width = { '--name-max': `${maxDisplayNameLength + prefixLength}ch`, '--prefix-width': `${prefixLength}ch` } as CSSProperties;
  return (
    <p title={label} style={width} className="flex max-w-(--name-max) min-w-0 items-center gap-2">
      <PlayerAvatar seed={avatarSeed} />
      <span className="min-w-0 truncate"><span className="inline-block max-sm:-ms-(--prefix-width)">{label}</span></span>
    </p>
  );
}

function GuestAvatar({ session }: { session: SessionIdentity }) {
  return <PlayerAvatar seed={avatarSeedOfSession(session)} name={session.guest.trainerName} />;
}

async function VisitorLinks() {
  const t = await getTranslations('AccountBar');
  return (
    <>
      <NavTab href="/login" activePaths={logInPaths} icon={<UserIcon />} label={t('logIn')} />
      <NavTab href="/signup" activePaths={signUpPaths} icon={<UserIcon />} label={t('signUp')} />
    </>
  );
}

async function LogOutButton() {
  const t = await getTranslations('AccountBar');
  return (
    <EndSessionForm className="flex min-w-0">
      <button type="submit" className="group inline-flex min-h-11 min-w-0 items-stretch">
        <span className={navTabFaceClass}>{t('logOut')}</span>
      </button>
    </EndSessionForm>
  );
}

async function Identity({ session }: { session: SessionIdentity | null }) {
  if (session?.account) return <AccountIdentity displayName={session.guest.trainerName} avatarSeed={avatarSeedOfSession(session)} />;
  return <>{session && <GuestAvatar session={session} />}<VisitorLinks /></>;
}

export async function AccountNav({ header }: { header: HeaderSession }) {
  if (!header.isReadable) return null;
  const t = await getTranslations('AccountBar');
  const session = header.session;
  const account = session?.account;
  return (
    <>
      <SessionSync identityKey={identityKey(header.session)} />
      <nav aria-label={t('label')} className="flex min-h-11 min-w-0 items-center gap-2">
        <Identity session={session} />
      </nav>
      {account && <LogOutButton />}
    </>
  );
}
