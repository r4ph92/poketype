'use client';
import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { PixelLink } from '@/components/pixel/PixelButton';
import { OverworldTrainer } from '@/components/pixel/OverworldTrainer';
import { pokedex } from '@/assets/pokedex';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { demoProfile } from './demo-profile';
import { PartnerCard } from './PartnerCard';
import { PokemonArt } from './PokemonArt';
import { useDemoTrainer } from './DemoTrainerProvider';
import { PracticeButton } from './PracticeButton';

const decorativeAlt = '';
const badgeDimensions = 64;

function StatIcon({ kind }: { kind: 'races' | 'wins' | 'averageWpm' | 'accuracy' }) {
  const paths = {
    races: 'M4 3v23M5 4h19v14H5M6 5h5v5H6m10-5h6v5h-6M11 10h5v6h-5',
    wins: 'M9 3h14v11l-4 5h-6l-4-5V3M9 6H4v8l6 3m13-11h5v8l-6 3M16 19v7M9 28h14',
    averageWpm: 'M3 25V15l5-8 8-3 8 3 5 8v10M8 24v-6m16 6v-6M16 22l6-9',
    accuracy: 'M16 1v8m0 14v8M1 16h8m14 0h8M9 7h14v4h4v12h-4v4H9v-4H5V11h4zM14 14h4v4h-4z',
  };
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" shapeRendering="crispEdges"><path d={paths[kind]} fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

export function TrainerDashboard({ greeting, raceAction }: { greeting: string; raceAction: ReactNode }) {
  const t = useTranslations('Trainer');
  const { equipped, avatar, canChooseTrainer } = useDemoTrainer();
  const [badge, setBadge] = useState<(typeof demoProfile.badges)[number]>(demoProfile.badges[0]);
  const species = pokedex.find((pokemon) => pokemon.dex === equipped.dex)?.species;
  return (
    <>
      <div className="trainer-layout">
        <div className="trainer-column">
          <PixelPanel titleId="play-title" level={1} title={greeting} variant="scene">
            <p className="trainer-welcome">{t('welcome')}</p>
              <div id="route-preview" className="trainer-camp">
                <Image src="/assets/scenes/camp.svg" width={800} height={460} alt={decorativeAlt} unoptimized priority className="camp-art" />
                <div className="camp-trainer"><OverworldTrainer avatar={avatar} scale={2} facing="east" /></div>
                <div className="camp-partner">{species ? <PokemonSprite species={species} scale={2} direction="west" animated={false} /> : <PokemonArt dex={equipped.dex} />}</div>
              </div>
            <div id="race-actions" className="trainer-actions">{raceAction}<PracticeButton /></div>
          </PixelPanel>
          <PixelPanel titleId="recent-races" title={t('recentRaces')}>
            <table className="recent-races-table"><caption className="sr-only">{t('recentRaces')}</caption><thead className="sr-only"><tr><th>{t('route')}</th><th>{t('place')}</th><th>{t('wpmLabel')}</th><th>{t('xp')}</th></tr></thead><tbody>
              {demoProfile.recentRaces.map((race) => <tr key={race.id}>
                <th scope="row"><span className={`route-mini route-${race.route}`} aria-hidden="true" />{t(`routes.${race.route}`)}</th>
                <td><span className={`rank-token rank-${race.place}`}>{t(`places.${race.place}`)}</span></td>
                <td>{t('wpm', { value: race.wpm })}</td><td className="text-success font-bold">{t('xpGain', { xp: race.xp })}</td>
              </tr>)}
            </tbody></table>
          </PixelPanel>
        </div>
        <div className="trainer-column">
          <PartnerCard pokemon={equipped} />
          <PixelLink href="/play/pokedex">{t('pokedexLink')}</PixelLink>
          <PixelPanel titleId="trainer-stats" title={t('stats')}>
            <dl className="trainer-stats">
              {(Object.entries(demoProfile.stats) as [keyof typeof demoProfile.stats, number][]).map(([key, value]) => <div key={key}><StatIcon kind={key} /><dd>{key === 'accuracy' ? t('percent', { value }) : value}</dd><dt>{t(key)}</dt></div>)}
            </dl>
          </PixelPanel>
          <PixelPanel titleId="trainer-badges" title={t('badgesTitle')} meta={t('badgeCount', { count: 4, total: 6 })}>
            <div className="badge-shelf">{demoProfile.badges.map((item) => <button type="button" key={item.id} aria-label={t('badgeLabel', { name: t(`badges.${item.id}`), status: t(item.earned ? 'earned' : 'locked') })} aria-pressed={badge.id === item.id} onClick={() => setBadge(item)} className="badge-button"><Image src={`/assets/badges/${item.id}.svg`} width={badgeDimensions} height={badgeDimensions} alt={decorativeAlt} unoptimized className={`pixelated ${item.earned ? '' : 'badge-locked'}`} /></button>)}</div>
            <Link href="/play/achievements" className="min-h-11 inline-flex items-center underline">{t('achievementsLink')}</Link>
            <p className="badge-caption" role="status">{t(`badges.${badge.id}`)}{t('separator')}{t(badge.earned ? 'earned' : 'locked')}</p>
          </PixelPanel>
        </div>
      </div>
      <div className="trainer-bottom">{canChooseTrainer && <Link href="/choose-trainer" className="inline-flex min-h-11 items-center font-pixel underline">{t('changeTrainer')}</Link>}<p role="status">{t('partnerHint', { name: t(`species.${equipped.dex}`) })}</p></div>
    </>
  );
}
