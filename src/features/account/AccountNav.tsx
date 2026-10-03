import { getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { UserIcon } from '@/components/pixel/icons/icons';
import { NavTab, navTabFaceClass } from '@/components/header/NavTab';
import { maxDisplayNameLength } from '@/config/game';
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

async function AccountIdentity({ username }: { username: string }) {
  const t = await getTranslations('AccountBar');
  const label = t('account', { username });
  const prefixLength = t('account', { username: '' }).length;
  const width = { '--name-max': `${maxDisplayNameLength + prefixLength}ch` } as CSSProperties;
  return (
    <p title={label} style={width} className="max-w-(--name-max) min-w-0 truncate">
      {label}
    </p>
  );
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

export async function AccountNav({ header }: { header: HeaderSession }) {
  if (!header.isReadable) return null;
  const t = await getTranslations('AccountBar');
  const account = header.session?.account;
  return (
    <>
      <SessionSync identityKey={identityKey(header.session)} />
      <nav aria-label={t('label')} className="flex min-h-11 min-w-0 items-center gap-2">
        {account ? <AccountIdentity username={account.username} /> : <VisitorLinks />}
      </nav>
      {account && <LogOutButton />}
    </>
  );
}
