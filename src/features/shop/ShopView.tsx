'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { isPcBox, priceOf, quantityInBag, shopItemIds, type BagItem, type ShopItemId } from '@/domain/shop-item';
import { BagPanel } from './BagPanel';
import { ItemArt } from './ItemArt';
import { PurchaseDialog } from './PurchaseDialog';
import type { PurchaseState } from './purchase-state';
import { usePurchaseDialog } from './use-purchase-dialog';

type ShopViewProps = { coins: number; bag: readonly BagItem[]; pcBoxes: number };

export function ShopView({ coins, bag, pcBoxes }: ShopViewProps) {
  const t = useTranslations('Shop');
  const format = useFormatter();
  const { dialog, choice, choose, purchase } = usePurchaseDialog();
  return (
    <div className="shop-layout">
      <PixelPanel titleId="shop-title" level={1} title={t('title')} meta={<span className="coin-balance">{t('balance', { amount: format.number(coins) })}</span>}>
        <p>{t('intro')}</p>
        <PurchaseMessage state={purchase.state} />
        <ul className="shop-grid">
          {shopItemIds.map((item) => <li key={item}><ShopItemCard item={item} owned={isPcBox(item) ? pcBoxes : quantityInBag(bag, item)} onBuy={() => choose(item)} /></li>)}
        </ul>
      </PixelPanel>
      <BagPanel bag={bag} />
      <PurchaseDialog dialogRef={dialog} choice={choice} coins={coins} purchase={purchase} />
    </div>
  );
}

function ShopItemCard({ item, owned, onBuy }: { item: ShopItemId; owned: number; onBuy: () => void }) {
  const t = useTranslations('Shop');
  return (
    <article className="shop-item" aria-labelledby={`shop-item-${item}`}>
      <ItemArt item={item} />
      <h2 id={`shop-item-${item}`} className="font-pixel text-lg font-bold">{t(`items.${item}`)}</h2>
      <ItemDetails item={item} owned={owned} />
      <PixelButton variant="secondary" onClick={onBuy}><span aria-hidden="true">{t('buy')}</span><span className="sr-only">{t('buyItem', { item: t(`items.${item}`) })}</span></PixelButton>
    </article>
  );
}

function ItemDetails({ item, owned }: { item: ShopItemId; owned: number }) {
  const t = useTranslations('Shop');
  const format = useFormatter();
  const isBox = isPcBox(item);
  return (
    <>
      <p className="text-sm">{isBox ? t('boxHint', { slots: gameConfig.storage.boxSlots }) : t(item === 'poke-ball' ? 'ballHint' : 'stoneHint')}</p>
      <p className="font-pixel font-bold">{t('price', { amount: format.number(priceOf(item)) })}</p>
      <p className="text-sm text-muted">{t(isBox ? 'ownedBoxes' : 'owned', { count: owned })}</p>
    </>
  );
}

function PurchaseMessage({ state }: { state: PurchaseState }) {
  const t = useTranslations('Shop');
  if (state.outcome !== 'bought') return <p role="status" className="sr-only" />;
  return <p key={state.attempt} role="status" className="shop-message">{t('bought', { quantity: state.quantity, item: t(`items.${state.item}`) })}</p>;
}
