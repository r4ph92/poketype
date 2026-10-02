import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CollectionView } from '@/features/trainer/CollectionView';
import { findCurrentTrainer } from '@/features/trainer/current-trainer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Header');
  return { title: t('tabs.collection') };
}

export default async function CollectionPage() {
  return <CollectionView trainer={await findCurrentTrainer()} />;
}
