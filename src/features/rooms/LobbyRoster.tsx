'use client';

import { useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import type { RoomId } from '@/domain/room-id';
import type { BotView, MemberProfile, RoomMemberView } from '@/domain/room-view';
import { gameConfig } from '@/config/game';
import { defaultTrainerAvatar } from '@/assets/trainers';
import { OverworldTrainer } from '@/components/pixel/OverworldTrainer';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { PixelButton } from '@/components/pixel/PixelButton';
import { spriteBoxes } from '@/components/pixel/sprite-boxes';
import { RemovePlayerButton } from './RemovePlayerButton';

type LobbyRosterProps = { roomId: RoomId; members: RoomMemberView[]; isHostViewing: boolean };

// The host can remove any other player or bot from the waiting room; the removed player can join again by code or link.
export function LobbyRoster({ roomId, members, isHostViewing }: LobbyRosterProps) {
  const t = useTranslations('Lobby');
  const dialog = useRef<HTMLDialogElement>(null);
  const [selectedKey, select] = useState<string | null>(null);
  function open(member: RoomMemberView) {
    select(member.memberKey);
    dialog.current?.showModal();
  }
  return <>
    <div aria-live="polite"><ul className="lobby-roster">
      {members.map((member) => (
        <li key={member.memberKey} className="lobby-roster-item">
          <LobbyPlayerCard member={member} onOpen={() => open(member)} />
          {isHostViewing && !member.isViewer && (
            <RemovePlayerButton roomId={roomId} memberKey={member.memberKey} label={t('removePlayer')} accessibleLabel={t('removePlayerLabel', { name: member.trainerName })} failureMessage={t('removeFailed')} />
          )}
        </li>
      ))}
    </ul></div>
    <LobbyProfileDialog dialog={dialog} selected={members.find((member) => member.memberKey === selectedKey)} />
  </>;
}

// A bot has no overworld sprite of its own, so its card shows only the Pokémon it races with.
function LobbyPlayerCard({ member, onOpen }: { member: RoomMemberView; onOpen: () => void }) {
  const t = useTranslations('Lobby');
  return (
    <button type="button" className="lobby-player" data-racer={member.memberKey} data-viewer={member.isViewer || undefined} data-bot={member.bot ? true : undefined} aria-label={t('openProfile', { name: member.trainerName })} aria-haspopup="dialog" onClick={onOpen}>
      <span className="lobby-player-name">{member.trainerName}</span>
      <span className="lobby-player-sprites">{!member.bot && <OverworldTrainer avatar={member.trainerAvatar ?? defaultTrainerAvatar} scale={2} />}{member.partner && <PokemonSprite species={member.partner} box={spriteBoxes.lobbyCard} />}</span>
      <span className="lobby-player-badges">{member.bot ? <BotBadges bot={member.bot} /> : <PlayerBadges member={member} />}</span>
    </button>
  );
}

function PlayerBadges({ member }: { member: RoomMemberView }) {
  const room = useTranslations('Room');
  const play = useTranslations('Play');
  return <>{!member.hasAccount && <span>{play('guestLabel')}</span>}{member.isHost && <span>{room('hostBadge')}</span>}{member.isViewer && <span>{room('youMarker')}</span>}</>;
}

function BotBadges({ bot }: { bot: BotView }) {
  const t = useTranslations('Bots');
  return <><span className="bot-tag">{t('botTag')}</span><span>{t(`levels.${bot.level}`)}</span></>;
}

type LobbyProfileDialogProps = { dialog: RefObject<HTMLDialogElement | null>; selected: RoomMemberView | undefined };

function LobbyProfileDialog({ dialog, selected }: LobbyProfileDialogProps) {
  const t = useTranslations('Lobby');
  const pokemon = useTranslations('Pokemon');
  return (
    <dialog ref={dialog} aria-labelledby="lobby-profile-title" className="lobby-profile pixel-frame text-ink">
      <div className="flex items-center justify-between gap-4"><h2 id="lobby-profile-title" className="font-pixel text-xl font-bold wrap-anywhere">{selected?.trainerName ?? t('profile')}</h2><PixelButton variant="secondary" onClick={() => dialog.current?.close()}>{t('close')}</PixelButton></div>
      {selected ? <>
        <div className="lobby-profile-sprites">{!selected.bot && <OverworldTrainer avatar={selected.trainerAvatar ?? defaultTrainerAvatar} scale={3} facing="east" />}{selected.partner && <PokemonSprite species={selected.partner} box={spriteBoxes.lobbyProfile} direction="west" />}</div>
        <h3 className="font-pixel font-bold">{selected.partner ? t('buddy', { name: pokemon(selected.partner) }) : t('noBuddy')}</h3>
        {selected.bot ? <BotProfile bot={selected.bot} /> : <ProfileStats profile={selected.profile} />}
      </> : <p>{t('playerLeft')}</p>}
    </dialog>
  );
}

function BotProfile({ bot }: { bot: BotView }) {
  const t = useTranslations('Bots');
  return (
    <div className="grid gap-1">
      <p className="font-bold">{t('botProfile', { level: t(`levels.${bot.level}`) })}</p>
      <p>{t('botSpeed', { wpm: gameConfig.bots.levels[bot.level].wpm })}</p>
    </div>
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
