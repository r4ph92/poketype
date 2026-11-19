import { useTranslations } from 'next-intl';
import { heatLegend } from '@/domain/keyboard-heat';

export function HeatLegend({ maxCount }: { maxCount: number }) {
  const t = useTranslations('Room');
  return (
    <div className="heat-legend">
      <span>{t('missedKeysLegend')}</span>
      <ul>
        {heatLegend(maxCount).map(({ level, min, max }) => (
          <li key={level}>
            <i className="heat-key" data-heat={level} aria-hidden="true" />
            {min === max ? min : t('missedKeysRange', { min, max })}
          </li>
        ))}
      </ul>
    </div>
  );
}
