'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RoomMemberView } from '@/domain/room-view';
import { racerSpecies } from '@/domain/racer-appearance';
import { defaultTrainerAvatar } from '@/assets/trainers';
import { OverworldTrainer } from '@/components/pixel/OverworldTrainer';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { PixelButton } from '@/components/pixel/PixelButton';

export function LobbyRoster({ members }: { members: RoomMemberView[] }) {
  const t = useTranslations('Lobby');
  const room = useTranslations('Room');
  const pokemon = useTranslations('Pokemon');
  const play = useTranslations('Play');
  const dialog = useRef<HTMLDialogElement>(null);
  const [selectedKey, select] = useState<string | null>(null);
  const selected = members.find((member) => member.memberKey === selectedKey);
  function open(member: RoomMemberView) {
    select(member.memberKey);
    dialog.current?.showModal();
  }
  return <>
    <div aria-live="polite"><ul className="lobby-roster">
      {members.map((member) => <li key={member.memberKey}>
        <button type="button" className="lobby-player" data-racer={member.memberKey} data-viewer={member.isViewer || undefined} aria-label={t('openProfile', { name: member.trainerName })} aria-haspopup="dialog" onClick={() => open(member)}>
          <span className="lobby-player-name">{member.trainerName}</span>
          <span className="lobby-player-sprites"><OverworldTrainer avatar={member.trainerAvatar ?? defaultTrainerAvatar} scale={2} /><PokemonSprite species={racerSpecies(member.memberKey)} scale={1} /></span>
          <span className="lobby-player-badges">{!member.hasAccount && <span>{play('guestLabel')}</span>}{member.isHost && <span>{room('hostBadge')}</span>}{member.isViewer && <span>{room('youMarker')}</span>}</span>
        </button>
      </li>)}
    </ul></div>
    <dialog ref={dialog} aria-labelledby="lobby-profile-title" className="lobby-profile pixel-frame text-ink">
      <div className="flex items-center justify-between gap-4"><h2 id="lobby-profile-title" className="font-pixel text-xl font-bold wrap-anywhere">{selected?.trainerName ?? t('profile')}</h2><PixelButton variant="secondary" onClick={() => dialog.current?.close()}>{t('close')}</PixelButton></div>
      {selected ? <>
        <div className="lobby-profile-sprites"><OverworldTrainer avatar={selected.trainerAvatar ?? defaultTrainerAvatar} scale={3} facing="east" /><PokemonSprite species={racerSpecies(selected.memberKey)} scale={3} direction="west" /></div>
        <h3 className="font-pixel font-bold">{t('buddy', { name: pokemon(racerSpecies(selected.memberKey)) })}</h3>
        <p className="text-sm text-muted">{t('demoHint')}</p>
        <dl className="lobby-profile-stats">
          <div><dt>{t('level')}</dt><dd>{t('demoLevel')}</dd></div>
          <div><dt>{t('averageWpm')}</dt><dd>{t('demoWpm')}</dd></div>
          <div><dt>{t('accuracy')}</dt><dd>{t('demoAccuracy')}</dd></div>
          <div><dt>{t('races')}</dt><dd>{t('demoRaces')}</dd></div>
          <div><dt>{t('wins')}</dt><dd>{t('demoWins')}</dd></div>
        </dl>
      </> : <p>{t('playerLeft')}</p>}
    </dialog>
  </>;
}
