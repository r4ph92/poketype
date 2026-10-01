import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageMain } from '@/components/pixel/PageMain';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('roomNotFoundTitle') };
}

export default async function RoomNotFoundPage() {
  const t = await getTranslations('Room');
  return (
    <PageMain>
      <h1 className="text-3xl font-bold">{t('notFoundHeading')}</h1>
      <p className="mt-4">{t('notFoundMessage')}</p>
      <Link href="/play" className="mt-6 inline-flex min-h-11 items-center underline">
        {t('backToPlay')}
      </Link>
    </PageMain>
  );
}
