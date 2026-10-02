'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { artwork } from '@/assets/manifest';
import { BallIcon, RaceFlagIcon } from '@/components/pixel/icons/icons';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelLink } from '@/components/pixel/PixelButton';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { SpriteMotion } from '@/components/pixel/SpriteMotion';
import { racerSpecies } from '@/domain/racer-appearance';
import type { RaceResultRow, RoomMemberView } from '@/domain/room-view';
import { CreateRoomButton } from '@/features/rooms/CreateRoomButton';
import { createRoom } from '@/features/rooms/create-room';
import { useFocusedHeading } from '@/features/rooms/use-focused-heading';
import { RacePokemonPortrait } from './RacePokemonPortrait';
import { formatWholeNumber, wholePercent } from './race-number-format';
import { isRanked, resultsTableRows, type RankedTableRow } from './results-table';
import { ResultTime } from './ResultTime';
import { ResultsTable } from './ResultsTable';

const decorativeAlt = '';

type RaceResultsViewProps = { results: RaceResultRow[]; members: RoomMemberView[]; leave: ReactNode };

export function RaceResultsView({ results, members, leave }: RaceResultsViewProps) {
  const t = useTranslations('Room');
  const pokemonName = useTranslations('Pokemon');
  const headingRef = useFocusedHeading(useTranslations('Metadata')('resultsTitle'));
  const format = useFormatter();
  const rows = resultsTableRows(results, members);
  const ranked = rows.filter(isRanked);
  const viewer = ranked.find((row) => row.isViewer);
  const hasViewerAbandoned = rows.some((row) => row.isViewer && row.abandoned);
  const partner = viewer ? racerSpecies(viewer.memberKey) : null;

  return (
    <div className="results-screen">
      <div className="results-layout">
        <section className="results-main pixel-frame pixel-notch" aria-labelledby="results-title">
          <header className="results-heading">
            <div className="flex items-center justify-center gap-3"><BallIcon /><h1 id="results-title" ref={headingRef} tabIndex={-1}>{t('resultsHeading')}</h1><BallIcon /></div>
            <p>{t('routeName')}</p>
          </header>
          <SpriteMotion showControls={false}>
            <div className="results-celebration">
              <Image src={artwork.podium.src} width={artwork.podium.width} height={artwork.podium.height} alt={decorativeAlt} unoptimized loading="eager" className="results-celebration-art" />
              <div className="results-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
              <div className="podium" aria-hidden="true">
                {ranked.filter((row) => row.place <= 3).map((row) => (
                  <div key={row.memberKey} className="podium-racer" data-viewer={row.isViewer} style={{ order: row.place === 1 ? 1 : row.place === 2 ? 0 : 2 }}>
                    <span className="podium-name">{row.trainerName}</span>
                    <div className="podium-sprite"><RacePokemonPortrait species={racerSpecies(row.memberKey)} /></div>
                    <div data-rank={row.place} className="podium-step">{format.number(row.place)}</div>
                  </div>
                ))}
              </div>
            </div>
          </SpriteMotion>
          <div className="results-standings"><ResultsTable rows={rows} /></div>
        </section>

        <div className="results-sidebar">
          {hasViewerAbandoned && <DialogueBox><p>{t('abandonedResultsMessage')}</p></DialogueBox>}
          {viewer && <PixelPanel titleId="performance-title" title={<span className="results-panel-title"><BallIcon />{t('performance')}</span>}>
            <div className="performance-place">
              <span className="performance-rank">{format.number(viewer.place)}</span>
              <span className="performance-position"><span>{t('placeColumn')}</span><span className="text-sm">{t('placeOf', { total: rows.length })}</span></span>
            </div>
            <dl className="results-performance">
              <div><dd>{formatWholeNumber(format, viewer.grossWpm)}</dd><dt><abbr title={t('wpmMeaning')}>{t('wpmColumn')}</abbr></dt></div>
              <div><dd>{t('progressPercent', { percent: wholePercent(viewer.accuracy) })}</dd><dt>{t('accuracyColumn')}</dt></div>
            </dl>
            <p className="results-encouragement">{t(encouragementKey(viewer))}</p>
          </PixelPanel>}

          <PixelPanel titleId="race-recap-title" title={<span className="results-panel-title"><RaceFlagIcon />{t('raceRecap')}</span>}>
            {partner && <div className="results-partner"><RacePokemonPortrait species={partner} /><div><p className="text-sm text-muted">{t('racePartner')}</p><p className="font-pixel text-xl font-bold">{pokemonName(partner)}</p></div></div>}
            <dl className="results-recap">
              <div><dt>{t('racersLabel')}</dt><dd>{format.number(rows.length)}</dd></div>
              {viewer && <>
                <div><dt>{t('timeColumn')}</dt><dd><ResultTime finishMs={viewer.finishMs} /></dd></div>
                <div><dt>{t('errorsColumn')}</dt><dd>{format.number(viewer.errors)}</dd></div>
                <div><dt>{t('scoreColumn')}</dt><dd>{formatWholeNumber(format, viewer.score)}</dd></div>
              </>}
            </dl>
          </PixelPanel>

          <PixelPanel titleId="race-rewards-title" title={<span className="results-panel-title"><BallIcon />{t('raceRewards')}</span>} meta={t('rewardsSoon')}>
            <div className="results-rewards"><BallIcon size={48} /><p>{t('rewardsHint')}</p></div>
          </PixelPanel>
        </div>
      </div>
      <div className="results-actions">
        <form action={createRoom}><CreateRoomButton label={t('raceAgain')} /></form>
        <PixelLink href="/play/collection"><span className="results-panel-title"><BallIcon />{t('viewCollection')}</span></PixelLink>
        <PixelLink href="/play">{t('backToCamp')}</PixelLink>
        {leave}
        <p className="text-sm text-center text-ink">{t('raceAgainHint')}</p>
      </div>
    </div>
  );
}

function encouragementKey({ place, finishMs }: RankedTableRow): 'winnerMessage' | 'unfinishedMessage' | 'finisherMessage' {
  if (place === 1) return 'winnerMessage';
  return finishMs === null ? 'unfinishedMessage' : 'finisherMessage';
}
