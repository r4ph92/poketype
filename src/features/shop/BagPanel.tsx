import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { BagItem } from '@/domain/shop-item';
import { ItemArt } from './ItemArt';

export function BagPanel({ bag }: { bag: readonly BagItem[] }) {
  const t = useTranslations('Shop');
  return (
    <PixelPanel titleId="bag-title" title={t('bagTitle')}>
      {bag.length === 0 ? <p>{t('bagEmpty')}</p> : <ul className="bag-list">
        {bag.map(({ item, quantity }) => <li key={item}><ItemArt item={item} scale={1} /><span>{t(`items.${item}`)}</span><span className="font-pixel font-bold">{t('bagCount', { count: quantity })}</span></li>)}
      </ul>}
    </PixelPanel>
  );
}
