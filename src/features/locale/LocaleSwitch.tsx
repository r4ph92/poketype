import { getLocale, getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/config';
import { LocaleButton } from './LocaleButton';
import { ReturnPathField } from './ReturnPathField';
import { switchLocale } from './switch-locale';

export async function LocaleSwitch() {
  const t = await getTranslations('LocaleSwitch');
  const currentLocale = await getLocale();
  return (
    <form action={switchLocale}>
      <fieldset className="min-w-0">
        <legend className="float-left me-2 flex min-h-11 items-center font-pixel font-semibold">{t('label')}</legend>
        <ReturnPathField />
        <div className="flex flex-wrap gap-2">
          {locales.map((locale) => (
            <LocaleButton key={locale} locale={locale} isCurrent={locale === currentLocale}>
              <span lang={locale}>{t(`names.${locale}`)}</span>
            </LocaleButton>
          ))}
        </div>
      </fieldset>
    </form>
  );
}
