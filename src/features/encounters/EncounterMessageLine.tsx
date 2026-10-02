'use client';
import { useTranslations } from 'next-intl';
import { useSpriteMotion } from '@/components/pixel/SpriteMotion';
import { ItemArt } from '@/features/shop/ItemArt';
import type { EncounterMessage } from './encounter-message';

// The ball wobbles before a catch or an escape; without motion the outcome shows at once.
export function EncounterMessageLine({ message }: { message: EncounterMessage }) {
  const motion = useSpriteMotion();
  const text = useMessageText(message);
  const outcome = message.kind === 'throw' ? message.result.outcome : message.kind;
  return (
    <div key={message.attempt} className="encounter-message" data-outcome={outcome} data-animated={motion}>
      {message.kind === 'throw' && <ItemArt item="poke-ball" scale={1} />}
      <p role="status">{text}</p>
    </div>
  );
}

function useMessageText(message: EncounterMessage): string {
  const t = useTranslations('Encounter');
  const species = useTranslations('Trainer');
  if (message.kind === 'let-go') return t('letGoDone', { name: species(`species.${message.dex}`) });
  const { result } = message;
  if (result.outcome === 'missed') return t('result.missed', { name: species(`species.${result.dex}`), count: result.throwsLeft });
  if (result.outcome === 'caught' || result.outcome === 'fled') return t(`result.${result.outcome}`, { name: species(`species.${result.dex}`) });
  return t(`result.${result.outcome}`);
}
