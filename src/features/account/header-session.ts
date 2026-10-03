import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { findCurrentSession } from '@/server/sessions/current-session';
import type { SessionIdentity } from '@/server/sessions/session-store';

export type HeaderSession = { isReadable: true; session: SessionIdentity | null } | { isReadable: false };

// The page reads the same request-cached session and throws into its error boundary, so the header only hides the account part.
export async function readHeaderSession(): Promise<HeaderSession> {
  try {
    return { isReadable: true, session: await findCurrentSession() };
  } catch (error) {
    unstable_rethrow(error);
    console.error(error);
    return { isReadable: false };
  }
}

// Only a known visitor loses the game tabs: an unreadable session keeps them, as the page behind is a game page that failed.
export function showsGameNavigation(header: HeaderSession): boolean {
  return !header.isReadable || header.session !== null;
}
