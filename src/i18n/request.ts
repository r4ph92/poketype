import { getRequestConfig } from 'next-intl/server';
import { isLocale } from './config';
import { readLocalePreference } from './locale-cookie';

export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const locale = isLocale(explicitLocale) ? explicitLocale : await readLocalePreference();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
