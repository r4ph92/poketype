import 'server-only';
import { cookies } from 'next/headers';
import { localeCookieMaxAgeSeconds, localeCookieName, resolveLocale, type Locale } from './config';

export async function readLocalePreference(): Promise<Locale> {
  return resolveLocale((await cookies()).get(localeCookieName)?.value);
}

export async function writeLocalePreference(locale: Locale): Promise<void> {
  (await cookies()).set(localeCookieName, locale, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: localeCookieMaxAgeSeconds,
    secure: process.env.NODE_ENV === 'production',
  });
}
