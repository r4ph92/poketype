import { getTranslations } from 'next-intl/server';

// Once focused it joins the page flow instead of covering the wordmark link, so both keep a full-size target.
export async function SkipLink() {
  const t = await getTranslations('Header');
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:mx-4 focus:mt-4 focus:inline-flex focus:min-h-11 focus:items-center focus:self-start focus:border-4 focus:border-frame focus:bg-cream focus:px-4 focus:font-pixel focus:font-semibold focus:text-ink"
    >
      {t('skipToContent')}
    </a>
  );
}
