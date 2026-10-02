'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import { quantityInBag, type BagItem } from '@/domain/shop-item';
import { stoneOptionsFor, type StoneOption, type StoneResult } from '@/domain/stone-evolution';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { ItemArt } from '@/features/shop/ItemArt';
import { evolveWithStoneAction } from './evolve-with-stone';

export type StoneEvolution = Extract<StoneResult, { outcome: 'evolved' }>;

type Refusal = { outcome: Exclude<StoneResult['outcome'], 'evolved'>; attempt: number };

type StoneChoicesProps = { pokemon: OwnedPokemon; ownedDexes: ReadonlySet<number>; bag: readonly BagItem[]; onEvolved: (evolution: StoneEvolution) => void };

// Eevee lists three stones and the trainer picks one; most species list one, and the rest none.
export function StoneChoices({ pokemon, ownedDexes, bag, onEvolved }: StoneChoicesProps) {
  const t = useTranslations('Trainer');
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const options = stoneOptionsFor(pokemon.dex);
  if (options.length === 0) return null;

  async function submitStone(submitted: FormData): Promise<void> {
    const result = await evolveWithStoneAction(submitted);
    if (result.outcome === 'evolved') onEvolved(result);
    else setRefusal({ outcome: result.outcome, attempt: (refusal?.attempt ?? 0) + 1 });
  }

  return (
    <section aria-labelledby="stone-choices-title" className="stone-choices">
      <h3 id="stone-choices-title" className="font-pixel font-bold">{t('stonesTitle')}</h3>
      <ul className="grid gap-3">
        {options.map((option) => <li key={option.stone}><StoneOptionRow dex={pokemon.dex} option={option} isOwned={ownedDexes.has(option.into)} count={quantityInBag(bag, option.stone)} onUse={submitStone} /></li>)}
      </ul>
      {refusal && <p key={refusal.attempt} role="alert" className="font-bold text-error">{t(`stoneRefused.${refusal.outcome}`)}</p>}
    </section>
  );
}

type StoneOptionRowProps = { dex: number; option: StoneOption; isOwned: boolean; count: number; onUse: (submitted: FormData) => Promise<void> };

function StoneOptionRow({ dex, option, isOwned, count, onUse }: StoneOptionRowProps) {
  const t = useTranslations('Trainer');
  const shop = useTranslations('Shop');
  const stone = shop(`items.${option.stone}`);
  const into = t(`species.${option.into}`);
  return (
    <div className="stone-option">
      <ItemArt item={option.stone} scale={1} />
      <div className="grid gap-2">
        <p><span className="font-bold">{stone}</span> <span className="text-sm text-muted">{t('stoneCount', { count })}</span></p>
        <StoneAction dex={dex} option={option} names={{ stone, into }} isOwned={isOwned} count={count} onUse={onUse} />
      </div>
    </div>
  );
}

type StoneActionProps = Omit<StoneOptionRowProps, 'option'> & { option: StoneOption; names: { stone: string; into: string } };

function StoneAction({ dex, option, names, isOwned, count, onUse }: StoneActionProps) {
  const t = useTranslations('Trainer');
  if (isOwned) return <p className="text-sm">{t('stoneAlreadyOwned', names)}</p>;
  if (count === 0) return <p className="text-sm">{t('stoneMissing', names)} <Link href="/play/shop" className="font-pixel underline">{t('shopLink')}</Link></p>;
  return (
    <form action={onUse}>
      <input type="hidden" name="dex" value={dex} />
      <input type="hidden" name="stone" value={option.stone} />
      <SubmitButton label={t('useStone', names)} variant="secondary" />
    </form>
  );
}
