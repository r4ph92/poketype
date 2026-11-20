import type { ReactNode } from 'react';
import type { BotLevel } from '@/assets/bot-characters';
import { RoomPlayer } from '@/components/pixel/RoomPlayer';
import type { RoomMemberView } from '@/domain/room-view';

type RoomMemberListLabels = { hostBadge: string; spectator: string; you: string; bot: (level: BotLevel) => string };

export type MemberStatus<Member extends RoomMemberView> = (member: Member) => ReactNode;

type RoomMemberListProps<Member extends RoomMemberView> = { members: Member[]; labels: RoomMemberListLabels; statusOf?: MemberStatus<Member> };

export function RoomMemberList<Member extends RoomMemberView>({ members, labels, statusOf }: RoomMemberListProps<Member>) {
  return (
    <ul className="grid gap-2">
      {members.map((member) => (
        <RoomPlayer
          key={member.memberKey}
          avatarSeed={member.avatarSeed}
          partner={member.partner}
          name={member.trainerName}
          role={{ isHost: member.isHost, isSpectator: member.isSpectator, isViewer: member.isViewer, isBot: member.bot !== null }}
          labels={{ ...labels, bot: member.bot ? labels.bot(member.bot.level) : '' }}
          status={statusOf?.(member)}
        />
      ))}
    </ul>
  );
}
