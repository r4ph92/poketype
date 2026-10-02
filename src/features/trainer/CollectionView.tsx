import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PcStorage } from './PcStorage';
import { caughtDexesOf, type TrainerHubView } from './trainer-hub-view';

export function CollectionView({ trainer }: { trainer: TrainerHubView }) {
  const t = useTranslations('Trainer');
  return <><div className="flex flex-wrap gap-4"><Link href="/play/pokedex" className="min-h-11 inline-flex items-center font-pixel underline">{t('pokedexLink')}</Link><Link href="/play/achievements" className="min-h-11 inline-flex items-center font-pixel underline">{t('achievementsLink')}</Link></div><PcStorage collection={trainer.profile.collection} caughtDexes={caughtDexesOf(trainer.profile)} partner={trainer.partner} /></>;
}
