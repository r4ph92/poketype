import { getTranslations } from 'next-intl/server';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { gameConfig } from '@/config/game';
import { canShowProgression, type WpmPoint } from '@/domain/profile-stats';
import { WpmChart } from './WpmChart';
import { WpmTable } from './WpmTable';

export async function ProgressionPanel({ progression }: { progression: readonly WpmPoint[] }) {
  const t = await getTranslations('Profile');
  const isShown = canShowProgression(progression);
  return (
    <PixelPanel titleId="profile-progression" title={t('progressionTitle')} meta={isShown ? t('chartScope', { count: progression.length }) : undefined}>
      {isShown ? <Progression progression={progression} /> : <NotEnoughRaces />}
    </PixelPanel>
  );
}

async function Progression({ progression }: { progression: readonly WpmPoint[] }) {
  const t = await getTranslations('Profile');
  return (
    <>
      <WpmChart progression={progression} />
      <details className="wpm-data">
        <summary>{t('showData')}</summary>
        <WpmTable progression={progression} />
      </details>
    </>
  );
}

async function NotEnoughRaces() {
  const t = await getTranslations('Profile');
  return (
    <DialogueBox>
      <p>{t('notEnough', { count: gameConfig.profile.minimumChartRaces })}</p>
      <PixelLink href="/play/race" variant="primary">{t('startRace')}</PixelLink>
    </DialogueBox>
  );
}
