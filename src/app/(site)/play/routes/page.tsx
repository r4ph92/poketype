import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PixelPanel } from '@/components/pixel/PixelPanel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Header');
  return { title: t('tabs.routes') };
}

export default async function RoutesPage() {
  const t = await getTranslations('Trainer');
  const header = await getTranslations('Header');
  const decorativeAlt = '';
  return <PixelPanel titleId="routes-title" level={1} title={header('tabs.routes')}>
    <p>{t('routesHint')}</p>
    <div className="grid gap-6 lg:grid-cols-2">
      <PixelPanel titleId="forest-route-title" title={t('routes.forest')}>
        <Image src="/assets/scenes/route.svg" width={800} height={440} alt={decorativeAlt} unoptimized className="w-full border-2 border-frame pixelated" />
        <p>{t('routePreviewHint')}</p>
        <Link href="/play/race" className="inline-flex min-h-11 items-center font-pixel font-bold underline">{t('openRace')}</Link>
      </PixelPanel>
      <PixelPanel titleId="coast-route-title" title={t('routes.coast')}>
        <p>{t('comingSoon')}</p>
      </PixelPanel>
    </div>
  </PixelPanel>;
}
