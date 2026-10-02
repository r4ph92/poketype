import { useTranslations } from 'next-intl';
import { BallIcon } from '@/components/pixel/icons/icons';
import { PixelLink } from '@/components/pixel/PixelButton';

export function ResultsExitLinks() {
  const t = useTranslations('Room');
  return (
    <>
      <PixelLink href="/play/collection"><span className="results-panel-title"><BallIcon />{t('viewCollection')}</span></PixelLink>
      <PixelLink href="/play">{t('backToCamp')}</PixelLink>
    </>
  );
}
