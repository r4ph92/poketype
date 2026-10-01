import type { ReactNode } from 'react';
import { RoomPlayer } from '@/components/pixel/RoomPlayer';
import type { RoomMemberView } from '@/domain/room-view';

type RoomMemberListLabels = { hostBadge: string; you: string };

export type MemberStatus<Member extends RoomMemberView> = (member: Member) => ReactNode;

type RoomMemberListProps<Member extends RoomMemberView> = { members: Member[]; labels: RoomMemberListLabels; statusOf?: MemberStatus<Member> };

export function RoomMemberList<Member extends RoomMemberView>({ members, labels, statusOf }: RoomMemberListProps<Member>) {
  return (
    <ul className="grid gap-2">
      {members.map((member) => (
        <RoomPlayer
          key={member.memberKey}
          memberKey={member.memberKey}
          name={member.trainerName}
          isHost={member.isHost}
          isViewer={member.isViewer}
          labels={labels}
          status={statusOf?.(member)}
        />
      ))}
    </ul>
  );
}
