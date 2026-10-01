import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageMain } from '@/components/pixel/PageMain';
import { SiteShell } from '@/components/header/SiteShell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');
  return { title: t('notFoundTitle') };
}

// Unmatched addresses render here, outside the (site) layout, so this page brings the shared header itself.
export default async function NotFoundPage() {
  const t = await getTranslations('NotFound');
  return (
    <SiteShell>
      <PageMain>
        <h1 className="text-3xl font-bold">{t('heading')}</h1>
        <p className="mt-4">{t('message')}</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center underline">
          {t('homeLink')}
        </Link>
      </PageMain>
    </SiteShell>
  );
}
