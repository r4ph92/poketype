import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('notFoundTitle') };
}

export default async function NotFoundPage() {
  const t = await getTranslations('NotFound');
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('heading')}</h1>
      <p className="mt-4">{t('message')}</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center underline">
        {t('homeLink')}
      </Link>
    </main>
  );
}
