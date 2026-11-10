import 'server-only';
import { redirect } from 'next/navigation';
import { findCurrentSession } from '@/server/sessions/current-session';

// Only an account can host a room: a guest who reaches a create action anyway is sent to log in.
export async function requireHostingAccount(): Promise<void> {
  const session = await findCurrentSession();
  if (!session) redirect('/');
  if (session.account === null) redirect('/login');
}
