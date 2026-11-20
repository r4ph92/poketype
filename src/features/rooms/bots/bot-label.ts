import { useTranslations } from 'next-intl';
import type { BotLevel } from '@/assets/bot-characters';
import { gameConfig } from '@/config/game';

// "Bot · Noob": every place that shows a bot names its level the same way.
export function useBotLabel(): (level: BotLevel) => string {
  const t = useTranslations('Bots');
  return (level) => t('botLabel', { level: t(`levels.${level}`) });
}

// The level's documented net WPM range, "10–20", or "140+" for a level without a ceiling.
export function botWpmRangeText(level: BotLevel): string {
  const { min, max } = gameConfig.bots.levels[level].wpmRange;
  return max === null ? `${min}+` : `${min}–${max}`;
}
