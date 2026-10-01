import { getTranslations } from 'next-intl/server';
import { unstable_rethrow } from 'next/navigation';
import type { CSSProperties } from 'react';
import { UserIcon } from '@/components/pixel/icons/icons';
import { NavTab } from '@/components/header/NavTab';
import { maxDisplayNameLength } from '@/config/game';
import { findCurrentSession } from '@/server/sessions/current-session';
import type { SessionIdentity } from '@/server/sessions/session-store';
import { SessionSync } from './SessionSync';

type HeaderSession = { isReadable: true; session: SessionIdentity | null } | { isReadable: false };

const signUpPaths = ['/signup'] as const;

// The page reads the same request-cached session and throws into its error boundary, so the header only hides the account part.
async function readHeaderSession(): Promise<HeaderSession> {
  try {
    return { isReadable: true, session: await findCurrentSession() };
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    return { isReadable: false };
  }
}

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

export async function AccountNav() {
  const header = await readHeaderSession();
  if (!header.isReadable) return null;
  const t = await getTranslations('AccountBar');
  const { session } = header;
  return (
    <>
      <SessionSync identityKey={identityKey(session)} />
      <nav aria-label={t('label')} className="flex min-h-11 min-w-0 items-center">
        {session?.account ? (
          <AccountIdentity username={session.account.username} />
        ) : (
          <NavTab href="/signup" activePaths={signUpPaths} icon={<UserIcon />} label={t('signUp')} />
        )}
      </nav>
    </>
  );
}
