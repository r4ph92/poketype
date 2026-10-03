'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import { itemOptionsFor, type ItemEvolutionResult, type ItemOption } from '@/domain/item-evolution';
import { quantityInBag, type BagItem } from '@/domain/shop-item';
import type { OwnedPokemon } from '@/domain/trainer-profile';
import { ItemArt } from '@/features/shop/ItemArt';
import { evolveWithItemAction } from './evolve-with-item';

export type CompletedEvolution = Extract<ItemEvolutionResult, { outcome: 'evolved' }>;

type Refusal = { outcome: Exclude<ItemEvolutionResult['outcome'], 'evolved'>; attempt: number };

type EvolutionItemChoicesProps = { pokemon: OwnedPokemon; bag: readonly BagItem[]; onEvolved: (evolution: CompletedEvolution) => void };

// Eevee lists three stones and the trainer picks one; most species list one stone or item, and the rest none.
export function EvolutionItemChoices({ pokemon, bag, onEvolved }: EvolutionItemChoicesProps) {
  const t = useTranslations('Trainer');
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const options = itemOptionsFor(pokemon.dex);
  if (options.length === 0) return null;

  async function submitItem(submitted: FormData): Promise<void> {
    const result = await evolveWithItemAction(submitted);
    if (result.outcome === 'evolved') onEvolved(result);
    else setRefusal({ outcome: result.outcome, attempt: (refusal?.attempt ?? 0) + 1 });
  }

  return (
    <section aria-labelledby="evolution-items-title" className="evolution-items">
      <h3 id="evolution-items-title" className="font-pixel font-bold">{t('evolutionItemsTitle')}</h3>
      <ul className="grid gap-3">
        {options.map((option) => <li key={option.item}><ItemOptionRow pokemonId={pokemon.id} option={option} count={quantityInBag(bag, option.item)} onUse={submitItem} /></li>)}
      </ul>
      {refusal && <p key={refusal.attempt} role="alert" className="font-bold text-error">{t(`itemRefused.${refusal.outcome}`)}</p>}
    </section>
  );
}

type ItemOptionRowProps = { pokemonId: string; option: ItemOption; count: number; onUse: (submitted: FormData) => Promise<void> };

function ItemOptionRow({ pokemonId, option, count, onUse }: ItemOptionRowProps) {
  const t = useTranslations('Trainer');
  const shop = useTranslations('Shop');
  const item = shop(`items.${option.item}`);
  const into = t(`species.${option.into}`);
  return (
    <div className="evolution-item-option">
      <ItemArt item={option.item} scale={1} />
      <div className="grid gap-2">
        <p><span className="font-bold">{item}</span> <span className="text-sm text-muted">{t('itemCount', { count })}</span></p>
        <ItemAction pokemonId={pokemonId} option={option} names={{ item, into }} count={count} onUse={onUse} />
      </div>
    </div>
  );
}

type ItemActionProps = Omit<ItemOptionRowProps, 'option'> & { option: ItemOption; names: { item: string; into: string } };

function ItemAction({ pokemonId, option, names, count, onUse }: ItemActionProps) {
  const t = useTranslations('Trainer');
  if (count === 0) return <p className="text-sm">{t('itemMissing', names)} <Link href="/play/shop" className="font-pixel underline">{t('shopLink')}</Link></p>;
  return (
    <form action={onUse}>
      <input type="hidden" name="pokemonId" value={pokemonId} />
      <input type="hidden" name="item" value={option.item} />
      <SubmitButton label={t('useItem', names)} variant="secondary" />
    </form>
  );
}
