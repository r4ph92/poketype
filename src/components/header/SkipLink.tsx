import { getTranslations } from 'next-intl/server';

export async function SkipLink() {
  const t = await getTranslations('Header');
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-10 focus:border-4 focus:border-frame focus:bg-cream focus:px-4 focus:py-2 focus:font-pixel focus:font-semibold focus:text-ink"
    >
      {t('skipToContent')}
    </a>
  );
}
