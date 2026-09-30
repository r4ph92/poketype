import 'server-only';
import { cookies } from 'next/headers';

const sessionCookieName = 'poketype_session';

export async function readSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(sessionCookieName)?.value;
}

export async function writeSessionCookie(token: string): Promise<void> {
  (await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(sessionCookieName);
}
