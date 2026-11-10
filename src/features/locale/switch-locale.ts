'use server';

import { RedirectType, redirect } from 'next/navigation';
import { safeReturnPath } from '@/domain/return-path';
import { isLocale } from '@/i18n/config';
import { writeLocalePreference } from '@/i18n/locale-cookie';
import { parseForm } from '@/server/validation/parse-form';
import { localeFormSchema } from '@/server/validation/preference-form-schemas';

export async function switchLocale(formData: FormData): Promise<void> {
  const form = parseForm(formData, localeFormSchema);
  if (form && isLocale(form.locale)) await writeLocalePreference(form.locale);
  redirect(safeReturnPath(form?.returnTo), RedirectType.replace);
}
