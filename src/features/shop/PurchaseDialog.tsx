'use client';

import { useId, useState, type RefObject } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { PixelButton } from '@/components/pixel/PixelButton';
import { gameConfig } from '@/config/game';
import { parsePurchaseQuantity, priceOf, type ShopItemId } from '@/domain/shop-item';
import { ItemArt } from './ItemArt';
import type { PurchaseState } from './purchase-state';

export type PurchaseChoice = { item: ShopItemId; purchaseKey: string };

type Purchase = { action: (submitted: FormData) => void; pending: boolean; state: PurchaseState };

type PurchaseDialogProps = { dialogRef: RefObject<HTMLDialogElement | null>; choice: PurchaseChoice | null; coins: number; purchase: Purchase };

export function PurchaseDialog({ dialogRef, choice, coins, purchase }: PurchaseDialogProps) {
  const titleId = useId();
  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} className="confirm-dialog pixel-frame text-ink">
      {choice && <PurchaseForm key={choice.purchaseKey} titleId={titleId} choice={choice} coins={coins} purchase={purchase} onCancel={() => dialogRef.current?.close()} />}
    </dialog>
  );
}

type PurchaseFormProps = { titleId: string; choice: PurchaseChoice; coins: number; purchase: Purchase; onCancel: () => void };

// The total shown here is a preview; the server prices the purchase again and refuses it when the wallet cannot pay.
function PurchaseForm({ titleId, choice: { item, purchaseKey }, coins, purchase: { action, pending, state }, onCancel }: PurchaseFormProps) {
  const t = useTranslations('Shop');
  const format = useFormatter();
  const warningId = useId();
  const [quantity, setQuantity] = useState('1');
  const total = (parsePurchaseQuantity(quantity) ?? 0) * priceOf(item);
  const isAffordable = total > 0 && total <= coins;
  return (
    <form action={action} className="grid gap-4">
      <h2 id={titleId} className="font-pixel text-xl font-bold">{t('dialogTitle', { item: t(`items.${item}`) })}</h2>
      <input type="hidden" name="item" value={item} />
      <input type="hidden" name="purchaseKey" value={purchaseKey} />
      <div className="flex items-center gap-4"><ItemArt item={item} /><p>{t('price', { amount: format.number(priceOf(item)) })}</p></div>
      <label className="grid gap-1 font-pixel font-bold">
        {t('quantity')}
        <input type="number" name="quantity" inputMode="numeric" min={1} max={gameConfig.economy.maxPurchaseQuantity} required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="min-h-11 w-32 border-2 border-slate bg-cream-deep px-3 font-sans font-normal" />
      </label>
      <p className="font-pixel text-lg font-bold">{t('total', { amount: format.number(total) })}</p>
      {!isAffordable && <p id={warningId} className="font-bold text-error">{total === 0 ? t('quantityRange', { max: gameConfig.economy.maxPurchaseQuantity }) : t('notEnough')}</p>}
      {state.outcome === 'insufficient-funds' && <p key={state.attempt} role="alert" className="font-bold text-error">{t('refused')}</p>}
      {state.outcome === 'invalid' && <p key={state.attempt} role="alert" className="font-bold text-error">{t('invalid')}</p>}
      <div className="flex flex-wrap gap-3">
        <PixelButton type="submit" pending={pending} unavailable={!isAffordable} describedBy={isAffordable ? undefined : warningId}>{t('confirm')}</PixelButton>
        <PixelButton variant="secondary" onClick={onCancel}>{t('cancel')}</PixelButton>
      </div>
    </form>
  );
}
