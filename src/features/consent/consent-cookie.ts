import 'server-only';
import { cookies } from 'next/headers';
import { consentCookieMaxAgeSeconds, consentCookieName, parseConsentLevel, type ConsentLevel } from './consent-level';

export async function readConsentLevel(): Promise<ConsentLevel | null> {
  return parseConsentLevel((await cookies()).get(consentCookieName)?.value);
}

export async function writeConsentLevel(level: ConsentLevel): Promise<void> {
  (await cookies()).set(consentCookieName, level, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: consentCookieMaxAgeSeconds,
    secure: process.env.NODE_ENV === 'production',
  });
}
