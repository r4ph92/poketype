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
      <fieldset>
        <legend className="float-left mr-2 flex min-h-11 items-center font-bold">{t('label')}</legend>
        <ReturnPathField />
        <div className="flex flex-wrap gap-2">
          {locales.map((locale) => {
            const isCurrent = locale === currentLocale;
            return (
              <LocaleButton key={locale} locale={locale} isCurrent={isCurrent}>
                {isCurrent && <span aria-hidden="true">{t('currentMark')}</span>}
                <span lang={locale}>{t(`names.${locale}`)}</span>
              </LocaleButton>
            );
          })}
        </div>
      </fieldset>
    </form>
  );
}
