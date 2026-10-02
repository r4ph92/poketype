import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { freeSlots } from '@/domain/pc-storage';
import { PcStorage } from './PcStorage';
import { caughtDexesOf, type TrainerHubView } from './trainer-hub-view';

export function CollectionView({ trainer }: { trainer: TrainerHubView }) {
  const t = useTranslations('Trainer');
  const { profile } = trainer;
  return <>
    <div className="flex flex-wrap gap-4"><Link href="/play/pokedex" className="min-h-11 inline-flex items-center font-pixel underline">{t('pokedexLink')}</Link><Link href="/play/achievements" className="min-h-11 inline-flex items-center font-pixel underline">{t('achievementsLink')}</Link></div>
    <StorageNotices trainer={trainer} />
    <PcStorage collection={profile.collection} pcBoxes={profile.pcBoxes} caughtDexes={caughtDexesOf(profile)} partner={trainer.partner} bag={profile.bag} />
  </>;
}

// A full PC holds back catches and earned legendaries, so it says so and points to the box in the shop.
function StorageNotices({ trainer: { profile } }: { trainer: TrainerHubView }) {
  const t = useTranslations('Trainer');
  const waiting = profile.legendaries.filter((legendary) => legendary.isWaiting);
  if (freeSlots(profile.collection.length, profile.pcBoxes) > 0) return null;
  return (
    <DialogueBox portrait={false}>
      <p>{t('pcFull')}</p>
      {waiting.map(({ dex }) => <p key={dex}>{t('legendaryWaiting', { name: t(`species.${dex}`) })}</p>)}
      <Link href="/play/shop" className="inline-flex min-h-11 items-center font-pixel underline">{t('buyBox')}</Link>
    </DialogueBox>
  );
}
