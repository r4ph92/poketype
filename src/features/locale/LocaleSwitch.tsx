import { getLocale, getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/config';
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
              <button
                key={locale}
                type="submit"
                name="locale"
                value={locale}
                aria-current={isCurrent ? 'true' : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 border-4 border-ink px-3 font-bold ${isCurrent ? 'bg-gold' : 'bg-cream'}`}
              >
                {isCurrent && <span aria-hidden="true">{t('currentMark')}</span>}
                <span lang={locale}>{t(`names.${locale}`)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </form>
  );
}
