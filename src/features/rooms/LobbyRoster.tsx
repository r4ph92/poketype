'use client';

import { useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import type { MemberProfile, RoomMemberView } from '@/domain/room-view';
import { defaultTrainerAvatar } from '@/assets/trainers';
import { OverworldTrainer } from '@/components/pixel/OverworldTrainer';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { PixelButton } from '@/components/pixel/PixelButton';

export function LobbyRoster({ members }: { members: RoomMemberView[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selectedKey, select] = useState<string | null>(null);
  function open(member: RoomMemberView) {
    select(member.memberKey);
    dialog.current?.showModal();
  }
  return <>
    <div aria-live="polite"><ul className="lobby-roster">
      {members.map((member) => <li key={member.memberKey}><LobbyPlayerCard member={member} onOpen={() => open(member)} /></li>)}
    </ul></div>
    <LobbyProfileDialog dialog={dialog} selected={members.find((member) => member.memberKey === selectedKey)} />
  </>;
}

function LobbyPlayerCard({ member, onOpen }: { member: RoomMemberView; onOpen: () => void }) {
  const t = useTranslations('Lobby');
  const room = useTranslations('Room');
  const play = useTranslations('Play');
  return (
    <button type="button" className="lobby-player" data-racer={member.memberKey} data-viewer={member.isViewer || undefined} aria-label={t('openProfile', { name: member.trainerName })} aria-haspopup="dialog" onClick={onOpen}>
      <span className="lobby-player-name">{member.trainerName}</span>
      <span className="lobby-player-sprites"><OverworldTrainer avatar={member.trainerAvatar ?? defaultTrainerAvatar} scale={2} />{member.partner && <PokemonSprite species={member.partner} scale={1} />}</span>
      <span className="lobby-player-badges">{!member.hasAccount && <span>{play('guestLabel')}</span>}{member.isHost && <span>{room('hostBadge')}</span>}{member.isViewer && <span>{room('youMarker')}</span>}</span>
    </button>
  );
}

type LobbyProfileDialogProps = { dialog: RefObject<HTMLDialogElement | null>; selected: RoomMemberView | undefined };

function LobbyProfileDialog({ dialog, selected }: LobbyProfileDialogProps) {
  const t = useTranslations('Lobby');
  const pokemon = useTranslations('Pokemon');
  return (
    <dialog ref={dialog} aria-labelledby="lobby-profile-title" className="lobby-profile pixel-frame text-ink">
      <div className="flex items-center justify-between gap-4"><h2 id="lobby-profile-title" className="font-pixel text-xl font-bold wrap-anywhere">{selected?.trainerName ?? t('profile')}</h2><PixelButton variant="secondary" onClick={() => dialog.current?.close()}>{t('close')}</PixelButton></div>
      {selected ? <>
        <div className="lobby-profile-sprites"><OverworldTrainer avatar={selected.trainerAvatar ?? defaultTrainerAvatar} scale={3} facing="east" />{selected.partner && <PokemonSprite species={selected.partner} scale={3} direction="west" />}</div>
        <h3 className="font-pixel font-bold">{selected.partner ? t('buddy', { name: pokemon(selected.partner) }) : t('noBuddy')}</h3>
        <ProfileStats profile={selected.profile} />
      </> : <p>{t('playerLeft')}</p>}
    </dialog>
  );
}

// Averages and the level stay a dash until there is something real to show.
function ProfileStats({ profile }: { profile: MemberProfile | null }) {
  const t = useTranslations('Lobby');
  if (!profile) return null;
  const shown = (value: number | null, format: (present: number) => string) => (value === null ? t('noValue') : format(value));
  return (
    <dl className="lobby-profile-stats">
      <div><dt>{t('level')}</dt><dd>{shown(profile.partnerLevel, String)}</dd></div>
      <div><dt>{t('averageWpm')}</dt><dd>{shown(profile.averageWpm, (wpm) => String(Math.round(wpm)))}</dd></div>
      <div><dt>{t('accuracy')}</dt><dd>{shown(profile.accuracy, (accuracy) => t('percent', { value: Math.round(accuracy * 100) }))}</dd></div>
      <div><dt>{t('races')}</dt><dd>{profile.races}</dd></div>
      <div><dt>{t('wins')}</dt><dd>{profile.wins}</dd></div>
    </dl>
  );
}
