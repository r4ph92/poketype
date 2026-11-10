'use server';

import { parseForm } from '@/server/validation/parse-form';
import { consentFormSchema } from '@/server/validation/preference-form-schemas';
import { writeConsentLevel } from './consent-cookie';
import { consentLevelFromForm, type ConsentLevel } from './consent-level';

export async function saveCookieConsent(formData: FormData): Promise<ConsentLevel> {
  if (!parseForm(formData, consentFormSchema)) return 'necessary';
  const level = consentLevelFromForm(formData);
  await writeConsentLevel(level);
  return level;
}
