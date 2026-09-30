import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('Home');
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-lg">{t('welcome')}</p>
    </main>
  );
}
