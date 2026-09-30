'use server';

import { RedirectType, redirect } from 'next/navigation';
import { safeReturnPath } from '@/domain/return-path';
import { isLocale } from '@/i18n/config';
import { writeLocalePreference } from '@/i18n/locale-cookie';

export async function switchLocale(formData: FormData): Promise<void> {
  const locale = formData.get('locale');
  if (isLocale(locale)) await writeLocalePreference(locale);
  redirect(safeReturnPath(formData.get('returnTo')), RedirectType.replace);
}
