'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { frameOf, stageSizeOf } from '@/components/pixel/sprite-sheet';
import { gameConfig } from '@/config/game';
import { leadersWithViewer, type Leader } from './race-leaders';
import type { Racer } from './racers';

type RaceLeaderBarProps = { racers: Racer[]; passageLength: number };

// One shared start-to-finish track; each marker keeps its own lane so names never cover each other.
export function RaceLeaderBar({ racers, passageLength }: RaceLeaderBarProps) {
  const t = useTranslations('Room');
  const leaders = leadersWithViewer(racers, gameConfig.race.leaderBarSize);
  return (
    <section aria-labelledby="leader-bar-title" className="grid gap-2">
      <h2 id="leader-bar-title" className="font-pixel text-base font-bold uppercase tracking-[0.06em]">{t('leaderBoard')}</h2>
      <div className="leader-track" style={{ '--leader-lanes': leaders.length, '--leader-lane-height': `${laneHeightOf(leaders)}px` } as CSSProperties}>
        {leaders.map((leader, lane) => <LeaderMarker key={leader.racer.memberKey} leader={leader} lane={lane} passageLength={passageLength} />)}
        <div className="leader-ends" aria-hidden="true">
          <span>{t('trackStart')}</span>
          <span>{t('trackFinish')}</span>
        </div>
      </div>
    </section>
  );
}

const minimumLaneHeight = 44;
const markerChrome = 12;

// A lane holds its tallest partner's stage plus the marker's border and gap, so a giant never covers the lane below.
function laneHeightOf(leaders: Leader[]): number {
  const partnerHeights = leaders.flatMap(({ racer }) => (racer.partner ? [stageSizeOf(frameOf(racer.partner, 'idle'), 'fit').height] : []));
  return Math.max(minimumLaneHeight, ...partnerHeights.map((height) => height + markerChrome));
}

type LeaderMarkerProps = { leader: Leader; lane: number; passageLength: number };

function LeaderMarker({ leader: { racer, place }, lane, passageLength }: LeaderMarkerProps) {
  const t = useTranslations('Room');
  const bots = useTranslations('Bots');
  const percent = shareOfText(racer, passageLength) * 100;
  // Shifting the marker by its own share keeps it inside the track at both ends.
  const placement = { '--leader-lane': lane, left: `${percent}%`, transform: `translateX(-${percent}%)` } as CSSProperties;
  return (
    <p data-leader={racer.memberKey} data-bot={racer.bot ? true : undefined} data-place={place} data-share={Math.round(percent)} data-viewer={racer.isViewer || undefined} className="leader-marker" style={placement}>
      <span className="leader-place">{t('leaderPlace', { place })}</span>
      {racer.partner && <PokemonSprite species={racer.partner} scale={1} stage="fit" />}
      <span className={`leader-name ${racer.isViewer ? 'marker-next' : ''}`}>{racer.trainerName}</span>
      {racer.bot && <span className="bot-tag">{bots('botTag')}</span>}
    </p>
  );
}

function shareOfText(racer: Racer, passageLength: number): number {
  if (racer.isFinished) return 1;
  return Math.min(1, racer.progress.position / Math.max(1, passageLength));
}
