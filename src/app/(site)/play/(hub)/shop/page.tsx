import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ShopView } from '@/features/shop/ShopView';
import { findCurrentTrainer } from '@/features/trainer/current-trainer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Header');
  return { title: t('tabs.shop') };
}

export default async function ShopPage() {
  const { profile } = await findCurrentTrainer();
  return <ShopView coins={profile.coins} bag={profile.bag} pcBoxes={profile.pcBoxes} />;
}
