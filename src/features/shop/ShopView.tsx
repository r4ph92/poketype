'use client';

import { useActionState, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { PixelButton } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { priceOf, quantityInBag, shopItemIds, type BagItem, type ShopItemId } from '@/domain/shop-item';
import { BagPanel } from './BagPanel';
import { buyItemAction } from './buy-item';
import { ItemArt } from './ItemArt';
import { PurchaseDialog, type PurchaseChoice } from './PurchaseDialog';
import { initialPurchaseState, type PurchaseState } from './purchase-state';

type ShopViewProps = { coins: number; bag: readonly BagItem[] };

// A fresh request key per opened dialog: a double click on "Confirmer" sends the same key twice and is charged once.
export function ShopView({ coins, bag }: ShopViewProps) {
  const t = useTranslations('Shop');
  const format = useFormatter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [choice, setChoice] = useState<PurchaseChoice | null>(null);
  const [state, action, pending] = useActionState(async (previous: PurchaseState, submitted: FormData) => {
    const next = await buyItemAction(previous, submitted);
    if (next.outcome === 'bought') dialog.current?.close();
    return next;
  }, initialPurchaseState);

  function choose(item: ShopItemId): void {
    setChoice({ item, purchaseKey: crypto.randomUUID() });
    dialog.current?.showModal();
  }

  return (
    <div className="shop-layout">
      <PixelPanel titleId="shop-title" level={1} title={t('title')} meta={<span className="coin-balance">{t('balance', { amount: format.number(coins) })}</span>}>
        <p>{t('intro')}</p>
        <PurchaseMessage state={state} />
        <ul className="shop-grid">
          {shopItemIds.map((item) => <li key={item}><ShopItemCard item={item} owned={quantityInBag(bag, item)} onBuy={() => choose(item)} /></li>)}
        </ul>
      </PixelPanel>
      <BagPanel bag={bag} />
      <PurchaseDialog dialogRef={dialog} choice={choice} coins={coins} purchase={{ action, pending, state }} />
    </div>
  );
}

function ShopItemCard({ item, owned, onBuy }: { item: ShopItemId; owned: number; onBuy: () => void }) {
  const t = useTranslations('Shop');
  const format = useFormatter();
  return (
    <article className="shop-item" aria-labelledby={`shop-item-${item}`}>
      <ItemArt item={item} />
      <h2 id={`shop-item-${item}`} className="font-pixel text-lg font-bold">{t(`items.${item}`)}</h2>
      <p className="text-sm">{t(item === 'poke-ball' ? 'ballHint' : 'stoneHint')}</p>
      <p className="font-pixel font-bold">{t('price', { amount: format.number(priceOf(item)) })}</p>
      <p className="text-sm text-muted">{t('owned', { count: owned })}</p>
      <PixelButton variant="secondary" onClick={onBuy}><span aria-hidden="true">{t('buy')}</span><span className="sr-only">{t('buyItem', { item: t(`items.${item}`) })}</span></PixelButton>
    </article>
  );
}

function PurchaseMessage({ state }: { state: PurchaseState }) {
  const t = useTranslations('Shop');
  if (state.outcome !== 'bought') return <p role="status" className="sr-only" />;
  return <p key={state.attempt} role="status" className="shop-message">{t('bought', { quantity: state.quantity, item: t(`items.${state.item}`) })}</p>;
}
