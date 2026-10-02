import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CollectionView } from '@/features/trainer/CollectionView';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Header');
  return { title: t('tabs.collection') };
}

export default function CollectionPage() {
  return <CollectionView />;
}
