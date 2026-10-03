'use server';

import { writeConsentLevel } from './consent-cookie';
import { consentLevelFromForm, type ConsentLevel } from './consent-level';

export async function saveCookieConsent(formData: FormData): Promise<ConsentLevel> {
  const level = consentLevelFromForm(formData);
  await writeConsentLevel(level);
  return level;
}
