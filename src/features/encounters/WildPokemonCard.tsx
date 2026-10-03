'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SubmitButton } from '@/components/pixel/SubmitButton';
import type { WaitingEncounter } from '@/domain/trainer-profile';
import { maxThrowsFor, rarityOf } from '@/domain/wild-encounter';
import { PokemonArt } from '@/features/trainer/PokemonArt';
import type { EncounterNotice } from './encounter-message';
import { letEncounterGoAction } from './let-encounter-go';
import { throwBallAction } from './throw-ball';

type WildPokemonCardProps = { encounter: WaitingEncounter; balls: number; hasFreeSlot: boolean; onReport: (notice: EncounterNotice) => void };

export function WildPokemonCard({ encounter, balls, hasFreeSlot, onReport }: WildPokemonCardProps) {
  const t = useTranslations('Encounter');
  const trainer = useTranslations('Trainer');
  const name = trainer(`species.${encounter.dex}`);
  const rarity = rarityOf(encounter.dex) ?? 'common';
  const throws = maxThrowsFor(encounter.dex);
  async function letGo(submitted: FormData): Promise<void> {
    if ((await letEncounterGoAction(submitted)) === 'let-go') onReport({ kind: 'let-go', dex: encounter.dex });
    else onReport({ kind: 'throw', result: { outcome: 'gone' } });
  }
  return (
    <div className="encounter-card">
      <div className="encounter-art"><PokemonArt dex={encounter.dex} scale={2} /></div>
      <div className="grid content-start gap-2">
        <p className="font-pixel text-lg font-bold">{t('appeared', { name })}</p>
        <p>{trainer('level', { level: encounter.level })}</p>
        <p>{t('rarityLabel', { rarity: t(`rarity.${rarity}`) })}</p>
        {rarity === 'legendary' && <p className="font-bold">{t('legendaryHint')}</p>}
        <p>{t('throwsLeft', { count: throws - encounter.throwsUsed, total: throws })}</p>
        <p>{t('balls', { count: balls })}</p>
        <ThrowAction encounter={encounter} balls={balls} hasFreeSlot={hasFreeSlot} onReport={onReport} />
        <form action={letGo}><input type="hidden" name="encounterId" value={encounter.id} /><SubmitButton label={t('letGo')} variant="secondary" /></form>
      </div>
    </div>
  );
}

// The server checks the PC and the bag again; these states only spare the trainer a throw that would be refused.
function ThrowAction({ encounter, balls, hasFreeSlot, onReport }: WildPokemonCardProps) {
  const t = useTranslations('Encounter');
  const trainer = useTranslations('Trainer');
  async function throwBall(submitted: FormData): Promise<void> {
    onReport({ kind: 'throw', result: await throwBallAction(submitted) });
  }
  if (!hasFreeSlot) return <div className="grid gap-1"><p className="font-bold">{t('pcFull')}</p><Link href="/play/shop" className="inline-flex min-h-11 items-center font-pixel underline">{trainer('buyBox')}</Link><Link href="/play/collection" className="inline-flex min-h-11 items-center font-pixel underline">{t('collectionLink')}</Link></div>;
  if (balls === 0) return <div className="grid gap-1"><p className="font-bold">{t('noBall')}</p><Link href="/play/shop" className="inline-flex min-h-11 items-center font-pixel underline">{trainer('shopLink')}</Link></div>;
  return (
    <form action={throwBall}>
      <input type="hidden" name="encounterId" value={encounter.id} />
      <input type="hidden" name="throwNumber" value={encounter.throwsUsed + 1} />
      <SubmitButton label={t('throw')} />
    </form>
  );
}
