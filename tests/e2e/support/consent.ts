import { consentCookieName, type ConsentLevel } from '../../../src/features/consent/consent-level';

type StorageState = {
  cookies: { name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: 'Lax' }[];
  origins: [];
};

export function consentState(level: ConsentLevel): StorageState {
  return {
    cookies: [{ name: consentCookieName, value: level, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }],
    origins: [],
  };
}

// Every spec starts with consent already given so the first-visit dialog never covers the page; consent specs opt out.
export const acceptedConsentState = consentState('preferences');

export const noConsentState: StorageState = { cookies: [], origins: [] };
