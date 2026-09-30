import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales } from './config';

export default getRequestConfig(async ({ locale: explicitLocale }) => {
  const locale = hasLocale(locales, explicitLocale) ? explicitLocale : defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
