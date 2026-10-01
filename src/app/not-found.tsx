import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SiteShell } from '@/components/header/SiteShell';
import { NoticePanel } from '@/components/pixel/NoticePanel';
import { PageMain } from '@/components/pixel/PageMain';
import { PixelLink } from '@/components/pixel/PixelButton';

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
        <NoticePanel
          titleId="not-found-title"
          title={t('heading')}
          message={t('message')}
          action={<PixelLink href="/">{t('homeLink')}</PixelLink>}
        />
      </PageMain>
    </SiteShell>
  );
}
