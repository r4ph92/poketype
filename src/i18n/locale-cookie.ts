import 'server-only';
import { cookies, headers } from 'next/headers';
import { localeFromAcceptLanguage } from './accept-language';
import { isLocale, localeCookieMaxAgeSeconds, localeCookieName, type Locale } from './config';

// A saved choice always wins; without one, the browser's language picks between French and English.
export async function readLocalePreference(): Promise<Locale> {
  const saved = (await cookies()).get(localeCookieName)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
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
