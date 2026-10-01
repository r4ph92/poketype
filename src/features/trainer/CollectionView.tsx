'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PcStorage } from './PcStorage';
import { useDemoTrainer } from './DemoTrainerProvider';

export function CollectionView() {
  const t = useTranslations('Trainer');
  const { equipped, equip } = useDemoTrainer();
  return <><div className="flex flex-wrap gap-4"><Link href="/play/pokedex" className="min-h-11 inline-flex items-center font-pixel underline">{t('pokedexLink')}</Link><Link href="/play/achievements" className="min-h-11 inline-flex items-center font-pixel underline">{t('achievementsLink')}</Link></div><PcStorage equippedDex={equipped.dex} onEquip={equip} /></>;
}
